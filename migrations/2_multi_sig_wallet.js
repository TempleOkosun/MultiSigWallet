const MultiSigWallet = artifacts.require("MultiSigWallet");

module.exports = (deployer, networks, accounts) => {
    const numConfirmationsRequired = 2;
    deployer.deploy(MultiSigWallet, [accounts[0], accounts[1], accounts[2]], numConfirmationsRequired);
};
