const DRE = require('hardhat');

exports.getCurrentBlock = async () => {
    return DRE.ethers.provider.getBlockNumber();
};