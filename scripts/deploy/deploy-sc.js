const hh = require('hardhat')
const { saveFrontendFiles, toWei } = require('./buildUtils')

const MARKETPLACE_CONTRACT = 'AynnMarketplaceSC002'
const NFT_CONTRACTS = ['AynnNFTPayable003', 'AynnNFTPayable005']

async function deploy() {
  const [deployer] = await hh.ethers.getSigners()

  console.log('Deploying contracts with the account:', deployer.address)
  console.log('Account balance:', (await deployer.getBalance()).toString())

  let nftContractFactories = await Promise.all(NFT_CONTRACTS.map(async (x) => {
    return {
      factory: await ethers.getContractFactory(x),
      contract: x
    }
  }))

  nftContractFactories = await Promise.all(nftContractFactories.map(async (x) => ({
    ...x,
    deployed: await x.factory.deploy(
      'AYNN', 'AYNN',
      '0x0000000000000000000000000000000000000000',
      0,
      {
        value: ethers.utils.parseEther('1'),
      }
    )
  })))


  const aynnMarketplaceFactory = await ethers.getContractFactory(MARKETPLACE_CONTRACT)

  nftContractFactories.forEach(x => {
    saveFrontendFiles(x.deployed, x.contract)
  });


  const aynnMarketplace = await aynnMarketplaceFactory.deploy(500, toWei(10), toWei(10))

  // Save copies of each contracts abi and address to the frontend.
  saveFrontendFiles(aynnMarketplace, MARKETPLACE_CONTRACT)
}

deploy()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
