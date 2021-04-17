# AsetToken

The ASET token implements the standard methods of the ERC-20 interface. A balance snapshot feature has been added to keep track of the balances of the users at specific block heights. ASET also integrates the EIP 2612 `permit` function, that will allow gasless transaction and one tx approval/transfer.


### Run Tests
First of all, install dependencies and run below command to run the tests

```
npx hardhat test
```

## Enviroment Variables

| Variable                | Description                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------- |
| \$TESTNET_PK            | Private key of the address to deploy contracts to testnet.                          |
| \$MAINNET_KEY           | Private key of the address to deploy contracts to mainnet.                          |
| \$BSCSCAN_KEY           | BSCScan key, not currently used, but will be required for contracts verification.      |

### Contract Deployment

Deploy contract to bsc testnet:

```
npx hardhat run --network testnet scripts/deploy.js
```

Deploy contract to bsc mainnet:

```
npx hardhat run --network mainnet scripts/deploy.js
```


## Current Mainnet contracts

- **AsetToken proxy**: [0xA1DA4402ac8f33543528C9f760B336Cfa23bbA19](https://bscscan.com/address/0xa1da4402ac8f33543528c9f760b336cfa23bba19)
- **AsetToken implementation**: [0x70ae61904327082f3cc8D14b883A76646F287c83](https://bscscan.com/address/0x70ae61904327082f3cc8d14b883a76646f287c83)