const { expect } = require('chai')

describe('Aynn721_003', function () {
  let NFT
  let nft
  let addrs

  const nftName = 'DApp NFT'
  const nftSymbol = 'DAPP'

  let addressDeveloper = '0x70273Ef999AfF5dd5fb3eEdfF44DE5ab4b7AE28B'

  beforeEach(async function () {
    // Get the ContractFactories and Signers here.
    NFT = await ethers.getContractFactory('Aynn721_003')
      ;[deployer, addr1, addr2, ...addrs] = await ethers.getSigners()

    // To deploy our contracts
    nft = await NFT.deploy(nftName, nftSymbol, addressDeveloper, 300)
  })

  it('should mintFolder', async () => {
    let folderCid1 = 'folderCid'
    const batchSize = 20

    await nft.mintFolder(
      addressDeveloper,
      folderCid1,
      batchSize,
    )

    const tokenUri1 = await nft.tokenURI(1)

    expect(`ipfs://${folderCid1}/1.json`).to.equal(tokenUri1)

    let totalSupply = await nft.totalSupply()
    expect(20).to.equal(totalSupply)

    const tokenUri19 = await nft.tokenURI(19)
    expect(`ipfs://${folderCid1}/19.json`).to.equal(tokenUri19)

    expect(nft.tokenURI(20)).to.be.reverted

    // mint extra portion of data more
    const folderCid2 = 'folderCid2'

    await nft.mintFolder(
      addressDeveloper,
      folderCid2,
      5
    )

    totalSupply = await nft.totalSupply()
    expect(25).to.equal(totalSupply)

    expect(`ipfs://${folderCid1}/1.json`).to.equal(await nft.tokenURI(1))
    expect(`ipfs://${folderCid2}/25.json`).to.equal(await nft.tokenURI(25))
  })
})
