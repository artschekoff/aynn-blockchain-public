const { expect } = require('chai')
const { assert } = require('console')
const { constants } = require('ethers')
const { ethers } = require('hardhat')
const { toWei } = require('./testUtils')

describe('AynnDeployContracts', function () {
  let NFT
  let nft
  let addrs

  const nftName = 'DApp NFT'
  const nftSymbol = 'DAPP'

  let addressDeveloper = '0x70273Ef999AfF5dd5fb3eEdfF44DE5ab4b7AE28B'
  let folderHash = 'bafybeibdf7na555eh4wfjk5xnsfq7a2z5ji7lgnah7fcqb5xvzq35vyzqi'

  beforeEach(async function () {
    // Get the ContractFactories and Signers here.
    NFT = await ethers.getContractFactory('Aynn1155Folder_001')
      ;[deployer, addr1, addr2, ...addrs] = await ethers.getSigners()

    nft = await NFT.deploy(folderHash, constants.AddressZero, 0)

    //

    NFT = await ethers.getContractFactory('Aynn721_003')

    nft = await NFT.deploy(nftName, nftSymbol, addressDeveloper, 300)

    //

    NFT = await ethers.getContractFactory('Aynn721_Simple_001')

    nft = await NFT.deploy(nftName, nftSymbol)

    //

    NFT = await ethers.getContractFactory('Aynn721Drop_002')

    nft = await NFT.deploy('AYNN', 'AYNN', 'ipfs://wowowowowwo', 100, 10)

    // 

  })
  it('should first', () => { expect(true).eq(true) })
})
