const ethers = require('ethers');
const crypto = require ('crypto');

async function signTransaction(privateKey = 'e4af4ec32ef0767d237fb48472bdce5c9732f6f8130b9518f93695b583ce0929',
                               to = '0x2bFc2146E683ba11e0A0851Af1E21A441aa02a2B', amount = '5.0',
                               data = "0x0", nonce = crypto.randomBytes(28) ,
                               contractAddress = '0x19d727eD5052C992612b7f910a33d994527Ab9b7') {
    let wallet = new ethers.Wallet(privateKey);
    let amountWei = ethers.utils.parseEther(amount);

    let message = ethers.utils.concat([
        ethers.utils.hexZeroPad(to, 20),
        ethers.utils.hexZeroPad(ethers.utils.hexlify(amountWei), 32),
        ethers.utils.hexZeroPad(data, 2),
        ethers.utils.hexZeroPad(ethers.utils.hexlify(nonce), 32),
        ethers.utils.hexZeroPad(contractAddress, 20)
    ]);

    let messageHash = ethers.utils.keccak256(message);

    let sig = await wallet.signMessage(ethers.utils.arrayify(messageHash));
    let splitSig = ethers.utils.splitSignature(sig);
    message = {};
    message["to"] = to;
    message["amount"] = amountWei.toString();
    message["nonce"] = ethers.utils.hexZeroPad(ethers.utils.hexlify(nonce), 32);
    message["data"] = ethers.utils.hexZeroPad(data, 2);
    message["contractAddress"] = contractAddress;
    message["r"] = splitSig.r;
    message["s"] = splitSig.s;
    message["v"] = splitSig.v;

    console.log(message);
    return (message);
}

module.exports = {
    offchainTransaction : signTransaction()
}