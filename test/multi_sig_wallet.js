const chai = require("chai");
chai.use(require("chai-as-promised"));
const expect = chai.expect;

const MultiSigWallet = artifacts.require("MultiSigWallet");
const web3 = MultiSigWallet.web3;



contract("MultiSigWallet", accounts => {
    const owners = [accounts[0], accounts[1], accounts[2]];
    const requiredConfirmations = 2;

    let multiSigWalletInstance
    beforeEach(async () => {
        multiSigWalletInstance = await MultiSigWallet.new(owners, requiredConfirmations);
        assert.ok(multiSigWalletInstance);

        // Load funds into the wallet
        const deposit = web3.utils.toWei("20", "ether");
        // Send money to wallet contract
        await new Promise((resolve, reject) => web3.eth.sendTransaction({to: multiSigWalletInstance.address, value: deposit,
            from: owners[0]}, e => (e ? reject(e) : resolve())))
        const balance = await new Promise((resolve, reject) => web3.eth.getBalance(multiSigWalletInstance.address, (e, balance) =>
            (e ? reject(e) : resolve(balance))))
        assert.equal(balance.valueOf(), deposit)

    })

    // Is the contract properly deployed?
    // Does it have an ethereum address?
    it('should deploy successfully', async () => {
        const address = multiSigWalletInstance.address;
        assert.notEqual(address, 0x0);
        assert.notEqual(address, '');
        assert.notEqual(address, null);
        assert.notEqual(address, undefined);
    })


    describe('executeTransaction', () => {
        beforeEach(async () => {
            const to = owners[0];
            const value = web3.utils.toWei("5", "ether");
            const data = "0x0";

            // Set up needed to call execute transaction.
            // submit a transaction
            await multiSigWalletInstance.submitTransaction(to, value, data);
            // other owners excluding the sender must confirm
            await multiSigWalletInstance.confirmTransaction(0, {from: owners[1]});
            await multiSigWalletInstance.confirmTransaction(0, {from: owners[2]});
        })


        // execute transaction should succeed
        it('should execute', async () => {
            // call execute transaction
            const res = await multiSigWalletInstance.executeTransaction(0, {from: owners[0]});
            const {logs} = res;

            // What we need to check after a transaction is executed.
            assert.equal(logs[0].event, "ExecuteTransaction");
            assert.equal(logs[0].args.owner, owners[0]);
            assert.equal(logs[0].args.txIndex, 0);

            // Check if transaction.executed is set to true
            const tx = await multiSigWalletInstance.getTransaction(0)
            assert.equal(tx.executed, true)
        })

        it('should reject if transaction is already executed', async () => {
            await multiSigWalletInstance.executeTransaction(0, {from: owners[0]})

            /*
            try {
              await wallet.executeTransaction(0, { from: owners[0] })
              throw new Error("tx did not fail")
            } catch (error) {
              assert.equal(error.reason, "tx already executed")
            }
            */

            await expect(multiSigWalletInstance.executeTransaction(0, {from: owners[0]})).to.be.rejected

        })

        // Execution fails, because sender is not wallet owner
        it('should fail as sender is not an owner', async () => {
            await expect(multiSigWalletInstance.executeTransaction(0, {from: accounts[6]})).to.be.rejected;
        })


        // Execution fails, if confirmation is revoked
        it('should fail as confirmation is revoked', async () => {
            await multiSigWalletInstance.revokeConfirmation(0, {from: owners[1]} )
            await expect(multiSigWalletInstance.executeTransaction(0, { from: owners[0]} )).to.be.rejected
        })


        // it("should get signature values", async function () {
        //     const ethers = require('ethers');
        //     const MultiSigWallet = require('../build/contracts/MultiSigWallet.json');
        //     var pk = "e4af4ec32ef0767d237fb48472bdce5c9732f6f8130b9518f93695b583ce0929";
        //     let signingKey = new ethers.utils.SigningKey(pk);
        //     let provider = ethers.getDefaultProvider();
        //
        //     let wallet = new ethers.Wallet(pk, provider);
        //     console.log("Wallet address: " + wallet.address);
        //
        //     let contractAddress = MultiSigWallet['deployedAddress'];
        //     console.log("Contract Address: " + contractAddress);
        //     let contract = new ethers.Contract(contractAddress, MultiSigWallet['abiDefinition'], provider);
        //
        //     let message = ethers.utils.concat([
        //         ethers.utils.hexZeroPad("0x2bFc2146E683ba11e0A0851Af1E21A441aa02a2B", 20),
        //         ethers.utils.hexZeroPad(ethers.utils.hexlify(ethers.utils.parseEther(5)), 32),
        //         ethers.utils.hexZeroPad("0x0000", 2),
        //         ethers.utils.hexZeroPad(ethers.utils.hexlify(crypto.randomBytes(28)), 32),
        //         ethers.utils.hexZeroPad(contractAddress, 20)
        //     ]);
        //
        //     let messageDigest = ethers.utils.keccak256(message);
        //     console.log("Digest: " + messageDigest);
        //
        //     let signature = signingKey.signDigest(messageDigest);
        //     console.log(signature);
        //     let recovered = ethers.utils.recoverAddress(messageDigest, signature);
        //
        //     console.log("Recovered: " + recovered);
        //
        //     let publicKey = signingKey.publicKey;
        //
        //     console.log('Public Key: ' + publicKey);
        //
        //     let address = ethers.utils.computeAddress(publicKey);
        //
        //     console.log('Address: ' + address);
        // });

    })


});
