const { expect } = require('chai')

const toWei = (num) => ethers.utils.parseEther(num.toString())
const fromWei = (num) => ethers.utils.formatEther(num)

describe('AynnNFT', function () {
  let NFT
  let nft
  let deployer
  let addr1
  let addr2
  let addrs

  let URI = 'sample URI'

  const nftName = 'DApp NFT'
  const nftSymbol = 'DAPP'

  const mintingFee = toWei(0.1)

  let addressDeveloper = '0x70273Ef999AfF5dd5fb3eEdfF44DE5ab4b7AE28B'

  beforeEach(async function () {
    // Get the ContractFactories and Signers here.
    NFT = await ethers.getContractFactory('AynnNFT')
    ;[deployer, addr1, addr2, ...addrs] = await ethers.getSigners()

    // To deploy our contracts
    nft = await NFT.deploy(nftName, nftSymbol)
  })

  describe('Initializing and features test', function () {
    it('should support 2981, 721, 1155 interface', async () => {
      const isErc2981Supported = await nft.supportsInterface('0x2a55205a')
      const isErc721Supported = await nft.supportsInterface('0x80ac58cd')
      expect(isErc2981Supported).to.equal(true, '2981 not supported')
      expect(isErc721Supported).to.equal(true, '721 not supported')
    })
  })

  describe('Minting NFTs', function () {
    it('Should track name and symbol of the nft collection', async function () {
      // This test expects the owner variable stored in the contract to be equal
      // to our Signer's owner.
      expect(await nft.name()).to.equal(nftName)
      expect(await nft.symbol()).to.equal(nftSymbol)
    })

    it('Should track each minted NFT', async function () {
      // deployer mints an nft
      await nft.connect(deployer).mint(0, URI, { value: mintingFee })
      expect(await nft.totalSupply()).to.equal(1)
      expect(await nft.balanceOf(deployer.address)).to.equal(1)
      expect(await nft.tokenURI(0)).to.equal(URI)

      // deployer mints second NFT
      await nft.connect(deployer).mint(1, URI, { value: mintingFee })
      expect(await nft.totalSupply()).to.equal(2)
      expect(await nft.balanceOf(deployer.address)).to.equal(2)
      expect(await nft.tokenURI(1)).to.equal(URI)
    })
  })

  describe('Royalty system', () => {
    beforeEach(async function () {
      // addr1 mints an nft
      await nft.connect(deployer).mint(0, URI, { value: mintingFee })
    })

    it('Should support royalty standard interface', async function () {
      // const ERC721InterfaceId = '0x80ac58cd'
      const ERC2981InterfaceId = 0x2a55205a

      // const isERC721 = await nft.supportsInterface(ERC721InterfaceId)
      const isERC2981 = await nft.supportsInterface(ERC2981InterfaceId)

      // expect(isERC721).to.equal(true)
      expect(isERC2981).to.equal(true, 'ERC2981 not supported')
    })

    it.skip('Should send royalty to developer', async function () {
      const royaltyInfo = await nft.royaltyInfo(0, 1000)
      const royalty5Percent = 50

      // 5% of 1000 = 500
      expect(royaltyInfo[1].toNumber()).to.equal(
        royalty5Percent,
        'Contract developer royalty is 50 (5%)'
      )
      expect(royaltyInfo[0]).to.equal(addressDeveloper, 'Fee receiver is developer')
    })

    it('Should send one-time royalty', async function () {
      // await nft.mint(1, URI, { value: mintingFee })

      const balanceStart = await deployer.getBalance()

      await nft.mint(2, URI)

      const balanceEnd = await deployer.getBalance()

      const diff = fromWei(balanceStart) - fromWei(balanceEnd)

      expect(diff).to.lessThan(Number(fromWei(mintingFee)))
    })
  })

  describe('Mint amount', () => {
    it('Should mint with correct funds passed', async function () {
      await expect(
        nft.mintAmount(1, 'http://random.com', 2, {
          value: toWei(fromWei(mintingFee) * 2),
        })
      ).not.to.revertedWith('Should pay minting fee')

      await expect(await nft.totalSupply()).to.equal(2)
    })
  })
})
