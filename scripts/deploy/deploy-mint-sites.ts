import "@nomicfoundation/hardhat-ledger";

import hh from 'hardhat';
import { ContractAttacher, clearBuildFolder, toWei } from './buildUtils';

const BIRDIE = 'Birdie'

const ADDRESSES_FANTOM = {
  [BIRDIE]: '0x386B2239295bD3e72295b18BA103385f17c459Ae',
}

const ADDRESSES_SEPOLIA = {
  [BIRDIE]: '',
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

  // deploy 721 contracts

  // npx hardhat verify --network fantom 0x386B2239295bD3e72295b18BA103385f17c459Ae --contract src/contracts/token/ERC721/Birdie.sol:Birdie Birdie BDY ipfs://bafybeibdf7na555eh4wfjk5xnsfq7a2z5ji7lgnah7fcqb5xvzq35vyzqi/


  // npx hardhat verify --network sepolia 0x6f98dFAd9f5eD5b9f529f2fd0c7145374cea735B '#HASH' '0x0000000000000000000000000000000000000000' 0
  //0x6f98dFAd9f5eD5b9f529f2fd0c7145374cea735B
  // const folder = await attacher.attachOrDeploy("Aynn1155Folder_001", "#HASH", '0x0000000000000000000000000000000000000000', 0)

  const birdie = await attacher.attachOrDeploy(BIRDIE, 'Birdie', 'BDY', 'ipfs://bafybeibdf7na555eh4wfjk5xnsfq7a2z5ji7lgnah7fcqb5xvzq35vyzqi/')

  // await birdie.setBaseURI('ipfs://bafybeibdf7na555eh4wfjk5xnsfq7a2z5ji7lgnah7fcqb5xvzq35vyzqi/')
  // await birdie.preMint(20)
  // await birdie.pause(false)
  // await birdie.setCost(toWei(50))
  // await birdie.updateWhitelistStatus();
  await birdie.withdraw();
  // await birdie.setCost(toWei(0.005))
}



clearBuildFolder().then(() => deploy())
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
