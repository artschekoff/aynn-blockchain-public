import hh from 'hardhat'
import { ContractAttacher, clearBuildFolder, deployContracts, toWei } from './buildUtils'

const MARKETPLACE_CONTRACT = 'AynnDistributedMarketplace_001'

const NFT_CONTRACTS_721_LEGACY = ['AynnNFTPayable001']
const NFT_CONTRACTS_721 = ['AynnNFTPayable003', 'AynnNFTPayable005', 'Aynn721_001', 'Aynn721_002', 'Aynn721_003']
const NFT_CONTRACTS_SIMPLE = ['Aynn721_Simple_001']
const NFT_CONTRACTS_1155 = ['Aynn1155Folder_001']

const TRANSMITTER_CONTROLLER_CONTRACT = 'AynnTransmitterController_001'
const TRANSMITTER_721_1155 = 'AynnTransmitter721_1155_001'
const LISTING_STORE_CONTRACT = 'AynnListingStore_001'
const OFFER_STORE_CONTRACT = 'AynnOfferStore_001'
const DROP_721 = 'Aynn721Drop_002'


async function deploy() {
  const attacher = new ContractAttacher({})

  const [deployer] = await hh.ethers.getSigners()

  console.log('Deploying contracts with the account:', deployer.address)
  console.log('Account balance:', (await deployer.getBalance()).toString())

  // deploy 721 contracts
  await deployContracts(NFT_CONTRACTS_721_LEGACY, 'AYNN', 'AYNN', { value: toWei(1) })

  await deployContracts(NFT_CONTRACTS_SIMPLE, 'AYNN', 'AYNN')

  await deployContracts(NFT_CONTRACTS_721, 'AYNN', 'AYNN',
    '0x0000000000000000000000000000000000000000', 0, { value: toWei(1) })

  // deploy 1155 contracts
  await deployContracts(NFT_CONTRACTS_1155, "#HASH", '0x0000000000000000000000000000000000000000', 0)

  await deployContracts([DROP_721], 'AYNN', 'AYNN', 'ipfs://wowowowowwo', 100, 10)

  // marketplace
  const marketplaceInstance = await attacher.attachOrDeploy(MARKETPLACE_CONTRACT,
    deployer.address,
    5 * 100,
    toWei(2),
    toWei(2)
  )

  // transmitter
  const transmitterControllerInstance = await attacher.attachOrDeploy(TRANSMITTER_CONTROLLER_CONTRACT)
  await transmitterControllerInstance.setRemoteAllowance(marketplaceInstance.address, true)

  // transmitter 721_1155
  const transmitter721_1155Instance = await attacher.attachOrDeploy(TRANSMITTER_721_1155)
  await transmitter721_1155Instance.setRemoteAllowance(transmitterControllerInstance.address, true)
  await transmitterControllerInstance.setTransmitterAddress(0, transmitter721_1155Instance.address)

  // offer store
  const offerStoreInstance = await attacher.attachOrDeploy(OFFER_STORE_CONTRACT)
  await offerStoreInstance.setRemoteAllowance(marketplaceInstance.address, true)

  // listing store
  const listingStoreInstance = await attacher.attachOrDeploy(LISTING_STORE_CONTRACT)
  await listingStoreInstance.setRemoteAllowance(marketplaceInstance.address, true);

  await marketplaceInstance.setUnitAddress(0, listingStoreInstance.address);
  await marketplaceInstance.setUnitAddress(1, offerStoreInstance.address);
  await marketplaceInstance.setUnitAddress(2, transmitterControllerInstance.address);
}

clearBuildFolder().then(() => deploy())
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
