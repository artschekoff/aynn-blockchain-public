const { BigNumber } = require('ethers');
const hh = require('hardhat')

const CONTRACT_ADDRESS = "0x1be86166192357917d585a7cadd54e614248d31d";
const GAS_LIMIT = 285000

async function main() {
  const [deployer] = await hh.ethers.getSigners()

  // var provider = hh.ethers.getDefaultProvider();
  // const signer = new hh.ethers.Wallet(privateKey, provider);

  const myContract = await hh.ethers.getContractAt("AynnMarketplaceSC001", CONTRACT_ADDRESS);

  const gasLimit = new BigNumber.from(GAS_LIMIT)

  const receipt = await myContract.cancelListing("0x52b3b370e5242022f93b4429dcaceb87638a4eee", 1, { gasLimit })

  // const mintToken = await myContract.mint(1, { value: ethers.utils.parseEther("0.3") });

  console.log("Trx hash:", receipt.hash);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });