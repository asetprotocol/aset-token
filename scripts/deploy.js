require('dotenv').config()
let distributor = process.env.ASET_DISTRIBUTOR

async function main() {
    const AsetToken = await ethers.getContractFactory("AsetToken");
    console.log("Deploying AsetToken...");
    const aset = await upgrades.deployProxy(AsetToken, [distributor, "0x0000000000000000000000000000000000000000"]);
    console.log("AsetToken deployed to:", aset.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });