// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;


contract MultiSigWallet {

  // Events
  event Deposit(address indexed sender, uint amount, uint balance);
  event SubmitTransaction(address indexed owner, uint8 indexed txIndex, address indexed to, uint value, bytes data);
  event ConfirmTransaction(address indexed owner, uint8 indexed txIndex);
  event RevokeConfirmation(address indexed owner, uint8 indexed txIndex);
  event ExecuteTransaction(address indexed owner, uint8 indexed txIndex);


  // State variables
  address[] public owners;
  mapping(address => bool) public isOwner;

  mapping(bytes32 => bool) public usedNonces; // To prevent already used nonce.
  // mapping from tx index => owner => bool
  mapping(uint8 => mapping(address => bool)) public isConfirmed;

  uint8 public numConfirmationsRequired;

  struct Transaction{
    address from;
    address to;
    uint value;
    bytes data;
    bool executed;
    uint8 numConfirmations;
  }

  Transaction[] public transactions;

  // Modifiers
  modifier onlyOwner() {
    require(isOwner[msg.sender], "not owner");
    _;
  }

  modifier txExists(uint _txIndex){
    require(_txIndex < transactions.length, "transaction does not exist");
    _;
  }

  modifier notExecuted(uint _txIndex){
    require(!transactions[_txIndex].executed, "transaction already executed");
    _;
  }

  modifier notConfirmed(uint8 _txIndex){
    require(!isConfirmed[_txIndex][msg.sender], "transaction already confirmed");
    _;

  }


  constructor(address[] memory _owners, uint8 _numConfirmationsRequired) payable {
    require(_owners.length > 0, "owners required");
    require(_numConfirmationsRequired > 0 && _numConfirmationsRequired <= _owners.length, "invalid number of confirmations");

    for (uint8 i=0; i<_owners.length; i++){
      address owner = _owners[i];

      require(owner != address(0), "invalid owner");
      require(!isOwner[owner], "owner must be unique");

      isOwner[owner] = true;
      owners.push(owner);
    }

    numConfirmationsRequired = _numConfirmationsRequired;
  }


  // Receiving ethers
  receive() payable external {
    emit Deposit(msg.sender, msg.value, address(this).balance);
  }

  // Add transaction to pool
  function _addTransaction(address _from, address _to, uint _value, bytes memory _data) private {
    uint8 txIndex = uint8(transactions.length);
    transactions.push(Transaction({
    from: _from,
    to: _to,
    value: _value,
    data: _data,
    executed: false,
    numConfirmations: 0
    }));


    emit SubmitTransaction(msg.sender, txIndex, _to, _value, _data);
  }


  // The owner has to propose a transaction that must be approved by other owners
  function submitTransaction(address to, uint value, bytes memory data) public onlyOwner{
    _addTransaction(msg.sender, to, value, data);
  }


  // Other owners need to approve the transaction
  function confirmTransaction(uint8 _txIndex) public onlyOwner txExists(_txIndex) notExecuted(_txIndex) notConfirmed(_txIndex) {
    Transaction storage transaction = transactions[_txIndex];

    require(transaction.from != msg.sender, "you cannot approve your own transaction, get another owner to do this.");

    transaction.numConfirmations += 1;
    isConfirmed[_txIndex][msg.sender] = true;

    emit ConfirmTransaction(msg.sender, _txIndex);
  }


  //  Should the owner decide to cancel the transaction
  function revokeConfirmation(uint8 _txIndex) public onlyOwner txExists(_txIndex) notExecuted(_txIndex){
    Transaction storage transaction = transactions[_txIndex];

    require(isConfirmed[_txIndex][msg.sender], "transaction not confirmed");

    transaction.numConfirmations -= 1;
    isConfirmed[_txIndex][msg.sender] = false;

    emit RevokeConfirmation(msg.sender, _txIndex);

  }


  // If enough owners approve the transaction
  function executeTransaction(uint8 _txIndex) public onlyOwner txExists(_txIndex) notExecuted(_txIndex) {
    Transaction storage transaction = transactions[_txIndex];

    require(transaction.numConfirmations >= numConfirmationsRequired, "cannot execute transaction as number of confirmations required is not complete");
    transaction.executed = true;

    (bool success, ) = transaction.to.call{value: transaction.value}(transaction.data);

    require(success, "tx failed");

    emit ExecuteTransaction(msg.sender, _txIndex);

  }



  function verifySignature(address to, uint value, bytes memory data, bytes32 nonce, bytes32 r, bytes32 s, uint8 v) public {
    bytes32 messageHash = keccak256(abi.encodePacked(to, value, data, nonce, address(this)));

    require(!usedNonces[messageHash], "transaction submitted");
    usedNonces[messageHash] = true;

    bytes32 messageHash2 = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
    address signer = ecrecover(messageHash2, v, r, s);
    require(isOwner[signer], "not an owner");

    _addTransaction(signer, to, value, data);
  }


  function getOwners() public view returns (address[] memory){
    return owners;
  }


  function getTransactionCount() public view returns (uint){
    return transactions.length;

  }


  function getTransaction(uint8 _txIndex) public view returns (address from, address to, uint value, bytes memory data,
    bool executed, uint numConfirmations){
    Transaction storage transaction = transactions[_txIndex];
    return (
    transaction.from,
    transaction.to,
    transaction.value,
    transaction.data,
    transaction.executed,
    transaction.numConfirmations
    );
  }


  function getBalance() public onlyOwner view returns (uint){
    return address(this).balance;
  }


  function getContractAddress() public view returns (address){
    return address(this);
  }

}