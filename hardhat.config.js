require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require('@openzeppelin/hardhat-upgrades');
require('dotenv').config()

const BSC_PRIVATE_KEY_TESTNET = process.env.TESTNET_PK
const BSC_PRIVATE_KEY_MAINNET = process.env.MAINNET_KEY
const BSCSCAN_KEY = process.env.BSCSCAN_KEY

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    version: "0.7.5",
    settings: {
      optimizer: {
        enabled: true
      }
     }
    },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    hardhat: {
      accounts: {
        mnemonic: "buddy iron olive ginger arena stadium envelope please various scrub congress tumble"
      }
    },
    testnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      gasPrice: 20000000000,
      accounts: [`0x${BSC_PRIVATE_KEY_TESTNET}`]
    },
    mainnet: {
      url: "https://bsc-dataseed.binance.org/",
      chainId: 56,
      gasPrice: 20000000000,
      accounts: [`0x${BSC_PRIVATE_KEY_MAINNET}`]
    }
  },
  etherscan: {
    // Your API key for Etherscan/BSCScan
    apiKey: BSCSCAN_KEY
  }
};

