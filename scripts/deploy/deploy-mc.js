const hh = require('hardhat')
const { saveFrontendFiles, toWei } = require('./buildUtils')

async function deploy() {
  const [deployer] = await hh.ethers.getSigners()

  console.log('Deploying contracts with the account:', deployer.address)
  console.log('Account balance:', (await deployer.getBalance()).toString())

  const aynnNftFactory = await ethers.getContractFactory('AynnNFT')
  const aynnNftPayable003Factory = await ethers.getContractFactory('AynnNFTPayable003')
  const aynnNftPayable001Factory = await ethers.getContractFactory('AynnNFTPayable001')

  const aynnMarketplaceFactory = await ethers.getContractFactory('AynnMarketplace')

  const aynnMarketplaceSC002Factory = await ethers.getContractFactory('AynnMarketplaceSC002')

  const gldToken = await ethers.getContractFactory('GLDToken')

  // deploy contracts
  const aynnNft = await aynnNftFactory.deploy(
    'AYNN',
    'AYNN',
    '0x0000000000000000000000000000000000000000',
    0
  )

  const aynnNftPayable001 = await aynnNftPayable001Factory.deploy(
    'AYNN',
    'AYNN',
    {
      value: toWei(1)
    }
  )

  const aynnNftPayable003 = await aynnNftPayable003Factory.deploy(
    'AYNN',
    'AYNN',
    '0x0000000000000000000000000000000000000000',
    0,
    {
      value: toWei(1)
    }
  )
  const aynnMarketplace = await aynnMarketplaceFactory.deploy(1)
  const aynnMarketplaceSC002 = await aynnMarketplaceSC002Factory.deploy(1)
  const currencyContract = await gldToken.deploy('10000000000000000000000')

  // Save copies of each contracts abi and address to the frontend.
  saveFrontendFiles(aynnNftPayable001, 'AynnNFTPayable001')
  saveFrontendFiles(aynnNftPayable003, 'AynnNFTPayable003')
  saveFrontendFiles(aynnNft, 'AynnNFT')
  saveFrontendFiles(currencyContract, 'GLDToken')
  saveFrontendFiles(aynnMarketplace, 'AynnMarketplace')
  saveFrontendFiles(aynnMarketplaceSC002, 'AynnMarketplaceSC002')
}

async function manipulate() {
  const marketplace = require('../build/AynnMarketplace-address.json')
  const gldToken = require('../build/GLDToken-address.json')

  // // sending amount of test currency to test account
  const token = await ethers.getContractAt('GLDToken', gldToken.address)

  const accounts = await hh.ethers.getSigners()
  owner = accounts[0].address
  toAddress = accounts[1].address

  await token.symbol()

  totalSupply = await token.totalSupply()
  fromWei(totalSupply)

  await token.transfer(toAddress, toWei(100))

  ownerBalance = await token.balanceOf(owner)
  console.log('owner balance', fromWei(ownerBalance))

  toBalance = await token.balanceOf(toAddress)
  console.log('to balance', fromWei(toBalance))

  // registering token to smart contract
  const marketplaceInstance = await ethers.getContractAt('AynnMarketplace', marketplace.address)
  await marketplaceInstance.setPayableToken(gldToken.address, true, { gasLimit: 9000000 })
}


deploy()
  .then(() => manipulate())
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
