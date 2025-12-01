import "@nomicfoundation/hardhat-ledger";
import hh from 'hardhat';
import { ContractAttacher, clearBuildFolder, toWei } from './buildUtils';

const marketplaceRoyaltyAddress = process.env.MARKETPLACE_FEE_ADDRESS_FANTOM
const attestant = process.env.NONCE_ACCOUNT_ADDRESS

const MARKETPLACE_CONTRACT = 'AynnDistributedMarketplace_001'
const TRANSMITTER_CONTROLLER_CONTRACT = 'AynnTransmitterController_001'
const TRANSMITTER_721_1155 = 'AynnTransmitter721_1155_001'
const LISTING_STORE_CONTRACT = 'AynnListingStore_001'
const OFFER_STORE_CONTRACT = 'AynnOfferStore_001'

const ADDRESSES_FANTOM = {
  [MARKETPLACE_CONTRACT]: '0x9989752d8F78B4a65C8De2742f1b6e06d6d367A6',
  [TRANSMITTER_CONTROLLER_CONTRACT]: '0xd7cA220F129b9E2318eD1CF972BF86330652d8A1',
  [TRANSMITTER_721_1155]: '0x6Eb1c2F2Db6b3C1f3D6C49392380D0B622232516',
  [LISTING_STORE_CONTRACT]: '',
  [OFFER_STORE_CONTRACT]: ''
  // [LISTING_STORE_CONTRACT]: '0xd775BA05B0DB1f722F79586A4FCb1Bd39A63BD8A',
  // [OFFER_STORE_CONTRACT]: '0x938b89eA094A1f36ac8625d76A17A1F947ac4c2E'
}

const ADDRESSES_SEPOLIA = {
  [MARKETPLACE_CONTRACT]: '0x7c2369487fBD7070430f586E3C5b55A31A1066DC',
  [TRANSMITTER_CONTROLLER_CONTRACT]: '0x9127Ed33917c5Cc13535EF51F2e0221c4aEC4892',
  [TRANSMITTER_721_1155]: '0x30CBBBE781CE438ead7a2aE37627a5b00bAFB99e',
  [LISTING_STORE_CONTRACT]: '',
  [OFFER_STORE_CONTRACT]: ''
}

const DEPLOYMENT_ADDRESSES = {
  'fantom': ADDRESSES_FANTOM,
  'sepolia': ADDRESSES_SEPOLIA
}

async function deploy() {
  const networkName = hh.network.name

  const attacher = new ContractAttacher(DEPLOYMENT_ADDRESSES, networkName)

  const [deployer] = await hh.ethers.getSigners()

  console.log('Deploying contracts with the account:', deployer.address)
  console.log('Account balance:', (await deployer.getBalance()).toString())

  // marketplace
  const marketplaceInstance = await attacher.attachOrDeploy(MARKETPLACE_CONTRACT,
    marketplaceRoyaltyAddress,
    7.5 * 100,
    toWei(2),
    toWei(2)
  )

  await marketplaceInstance.setGlobalAttestant(attestant)

  // transmitter
  const transmitterControllerInstance = await attacher.attachOrDeploy(TRANSMITTER_CONTROLLER_CONTRACT)
  console.log(`${TRANSMITTER_CONTROLLER_CONTRACT} set remote allowance...`);
  await transmitterControllerInstance.setRemoteAllowance(marketplaceInstance.address, true)

  // transmitter 721_1155
  const transmitter721_1155Instance = await attacher.attachOrDeploy(TRANSMITTER_721_1155)
  console.log(`${TRANSMITTER_721_1155} set remote allowance...`);
  await transmitter721_1155Instance.setRemoteAllowance(transmitterControllerInstance.address, true)

  console.log(`${TRANSMITTER_CONTROLLER_CONTRACT} set transmitter address...`);
  await transmitterControllerInstance.setTransmitterAddress(0, transmitter721_1155Instance.address)

  // offer store
  const offerStoreInstance = await attacher.attachOrDeploy(OFFER_STORE_CONTRACT)
  console.log(`${OFFER_STORE_CONTRACT} set remote allowance...`);
  await offerStoreInstance.setRemoteAllowance(marketplaceInstance.address, true)

  // listing store
  const listingStoreInstance = await attacher.attachOrDeploy(LISTING_STORE_CONTRACT)
  console.log(`[x] ${LISTING_STORE_CONTRACT} set remote allowance...`);
  await listingStoreInstance.setRemoteAllowance(marketplaceInstance.address, true)

  // set unit addresses
  console.log(`${MARKETPLACE_CONTRACT} set unit addresses...`);
  await marketplaceInstance.setUnitAddress(0, listingStoreInstance.address)
  await marketplaceInstance.setUnitAddress(1, offerStoreInstance.address)
  await marketplaceInstance.setUnitAddress(2, transmitterControllerInstance.address)
}

clearBuildFolder().then(() => deploy())
  .then(() => process.exit(0))
  .catch((error: any) => {
    console.error(error)
    process.exit(1)
  })
