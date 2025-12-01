const { expect } = require('chai')
const { toWei } = require('./testUtils')

describe('Aynn721Drop_002', function () {
  let NFT
  let nft
  let addrs

  const nftName = 'DApp NFT'
  const nftSymbol = 'DAPP'

  let addressDeveloper = '0x70273Ef999AfF5dd5fb3eEdfF44DE5ab4b7AE28B'

  let folderHash = '#FOLDER_HASH#'
  let cost = 40
  let maxPerTx = 5
  let maxPerWallet = 50
  let preMinted = 10
  let maxSupply = 100

  beforeEach(async function () {
    // Get the ContractFactories and Signers here.
    NFT = await ethers.getContractFactory('Aynn721Drop_002')
      ;[deployer, addr1, addr2, ...addrs] = await ethers.getSigners()

    // To deploy our contracts
    nft = await NFT.deploy(
      nftName,
      nftSymbol,
      folderHash,
      maxSupply,
      preMinted)
  })

  it('should mint', async () => {
    // should fail when paused
    await expect(nft.mint(20)).to.be.reverted

    await nft.pause(false)

    // should be reverted when not whitelisted
    await expect(nft.mint(20)).to.be.reverted

    await nft.updateWhitelistStatus()

    await expect(nft.mint(20)).not.to.be.reverted

    let totalSupply = await nft.totalSupply()

    expect(20).to.equal(totalSupply)

    let tokenId = await nft.tokenByIndex(0)
    let tokenUri = await nft.tokenURI(tokenId)

    expect(`ipfs://${folderHash}/${tokenId}.json`).to.equal(tokenUri)
  })

  it('should mint all items', async () => {
    await nft.pause(false)
    await nft.updateWhitelistStatus()
    await nft.setMaxPerTx(maxSupply)
    await nft.setMaxPerWallet(maxSupply)

    await expect(nft.mint(maxSupply - preMinted)).not.to.be.reverted

    for (var i = 0; i < maxSupply - preMinted - 1; i++) {
      var tokenId = await nft.tokenByIndex(i)
      expect(Number(tokenId)).to.lessThanOrEqual(maxSupply)
    }
  })
})
