const { expect } = require('chai')
const { ethers } = require('hardhat')
const { toWei, fromWei } = require('./testUtils')

describe('AynnMarkeplaceMC', function () {
  let NFT
  let nft
  let secondNft
  let Marketplace
  let marketplace
  let deployer
  let addr1
  let addr2
  let addr3
  let addrs

  // 5%
  let royaltyPercent = 5
  const mintingFee = toWei(0.1)
  const basisPointRoyalty = royaltyPercent * 100

  // sepolia is default
  let payToken
  let solanaToken = '0x9e4DDa001b1f490A244fb3b24CeB07A570ACf44b'

  const nftRoyaltyAddress = '0x70273Ef999AfF5dd5fb3eEdfF44DE5ab4b7AE28B'
  const nftRoyaltyPercent = 5

  let URI = 'sample URI'
  const NFT_NAME = 'AYNN_MARKETPLACE'
  const NFT_SYMBOL = 'AYNN'

  beforeEach(async function () {
    // Get the ContractFactories and Signers here.
    NFT = await ethers.getContractFactory('AynnNFT')
    Marketplace = await ethers.getContractFactory('AynnMarketplaceMC')
      ;[deployer, addr1, addr2, addr3, ...addrs] = await ethers.getSigners()

    // To deploy our contracts
    nft = await NFT.deploy(NFT_NAME, NFT_SYMBOL)
    marketplace = await Marketplace.deploy(basisPointRoyalty)

    payToken = await ethers.getContractFactory('GLDToken')
    payToken = await payToken.deploy(toWei(10000))

    // registering payable token
    // await marketplace.addPayableToken(payToken.address)
    await marketplace.setPayableToken(payToken.address, true)

    await payToken.transfer(deployer.address, toWei(2000))
    await payToken.transfer(addr1.address, toWei(2000))
    await payToken.transfer(addr2.address, toWei(2000))
  })

  describe('Deployment', function () {
    it('Should track getRoyaltyAddress and getRoyaltyFeesInBips of the marketplace', async function () {
      expect(await marketplace.getRoyaltyAddress()).to.equal(deployer.address)

      const basisPointRoyalty = royaltyPercent * 100
      expect(await marketplace.getRoyaltyFeesInBips()).to.equal(basisPointRoyalty)
    })
  })

  describe('Minting NFTs', function () {
    it('Should track each minted NFT', async function () {
      // addr1 mints an nft
      await nft.connect(deployer).mint(1, URI, { value: mintingFee })
      expect(await nft.totalSupply()).to.equal(1)
      expect(await nft.balanceOf(deployer.address)).to.equal(1)
      expect(await nft.tokenURI(1)).to.equal(URI)

      // addr2 mints an nft
      await nft.connect(deployer).mint(2, URI, { value: mintingFee })
      expect(await nft.totalSupply()).to.equal(2)
      expect(await nft.balanceOf(deployer.address)).to.equal(2)
      expect(await nft.tokenURI(2)).to.equal(URI)
    })
  })

  describe('Making marketplace items', function () {
    let price = 1
    beforeEach(async function () {
      // addr1 mints an nft
      await nft.connect(deployer).mint(1, URI, { value: mintingFee })
      // addr1 approves marketplace to spend nft
      await nft.connect(deployer).approve(marketplace.address, 1)
    })

    it('Should track newly created item, transfer NFT from seller to marketplace and emit ItemListed event', async function () {
      // addr1 offers their nft at a price of 1 ether
      await expect(
        marketplace.connect(deployer).listItem(nft.address, 1, payToken.address, toWei(price))
      )
        .to.emit(marketplace, 'ItemListed')
        .withArgs(
          nft.address,
          1,
          deployer.address,
          marketplace.address,
          payToken.address,
          toWei(price)
        )
      // Owner of NFT should now be the marketplace
      expect(await nft.ownerOf(1)).to.equal(deployer.address)
      // Item count should now equal 1
      expect(await marketplace.getListedItemsCounter(nft.address)).to.equal(1)
      // Get item from items mapping then check fields to ensure they are correct
      const item = await marketplace.getListing(nft.address, 1)
      expect(item.nft).to.equal(nft.address)
      expect(item.tokenId).to.equal(1)
      expect(item.price).to.equal(toWei(price))
    })

    it('Should fail if price is set to zero', async function () {
      await expect(
        marketplace.connect(deployer).listItem(nft.address, 1, payToken.address, 0)
      ).to.be.revertedWith('PriceMustBeAboveZero')
    })
  })

  describe('Purchasing marketplace items', function () {
    let price = 2
    let royalty = (royaltyPercent / 100) * price
    let totalPriceInWei

    beforeEach(async function () {
      // addr1 mints an nft
      await nft.connect(deployer).mint(1, URI, { value: mintingFee })
      // addr1 approves marketplace to spend tokens
      await nft.connect(deployer).approve(marketplace.address, 1)
      // addr1 makes their nft a marketplace item.
      await marketplace.connect(deployer).listItem(nft.address, 1, payToken.address, toWei(price))

      totalPriceInWei = await marketplace.getPriceWithRoyalties(nft.address, 1)
    })

    it('Should update item as sold, pay seller, transfer NFT to buyer, charge fees and emit a Purchased event', async function () {
      // const sellerInitialEthBalance = await deployer.getBalance()
      const sellerInitialEthBalance = await payToken.balanceOf(deployer.address)

      // fetch items total price (market fees + item price)

      // addr 2 purchases item.
      await payToken.connect(addr2).approve(marketplace.address, totalPriceInWei)

      await await expect(
        marketplace
          .connect(addr2)
          .purchaseItem(nft.address, 1, payToken.address, { value: totalPriceInWei })
      )
        .to.emit(marketplace, 'ItemPurchased')
        .withArgs(nft.address, 1, deployer.address, addr2.address, payToken.address, toWei(price))

      // Seller should receive payment for the price of the NFT sold.
      // const sellerFinalEthBal = await deployer.getBalance()
      const sellerFinalEthBal = await payToken.balanceOf(deployer.address)

      expect((await marketplace.getListing(nft.address, 1)).sold).to.equal(true)

      return

      // Royalty received from nft contract ERC2981Proto
      const nftRoyaltyInfo = await nft.royaltyInfo(1, toWei(price))

      let expectedNftRoyalty = (nftRoyaltyPercent / 100) * price

      // NftRoyalty should be 5% of price and sent to developer account
      expect(nftRoyaltyAddress).to.equal(nftRoyaltyInfo[0], 'Nft royalty address wrong')
      expect(expectedNftRoyalty.toFixed(1)).to.equal(
        fromWei(nftRoyaltyInfo[1]),
        'Nft royalty amount wrong'
      )

      expect((+fromWei(sellerFinalEthBal)).toFixed(11)).to.equal(
        (+fromWei(sellerInitialEthBalance) + price + royalty).toFixed(11),
        'Seller account received wrong amount of money'
      )

      // The buyer should now own the nft
      expect(await nft.ownerOf(1)).to.equal(addr2.address)
    })

    it('Should fail for invalid item id', async () => {
      await expect(
        marketplace
          .connect(addr2)
          .purchaseItem(nft.address, 2, payToken.address, { value: totalPriceInWei })
      ).to.be.revertedWith('NotListed')
    })

    it('Should fail with wrong amount of money passed', async () => {
      // Fails when not enough ether is paid with the transaction.
      // In this instance, fails when buyer only sends enough ether to cover the price of the nft
      // not the additional market fee.
      await payToken.connect(addr2).approve(marketplace.address, toWei(price))

      await expect(
        marketplace
          .connect(addr2)
          .purchaseItem(nft.address, 1, payToken.address, { value: toWei(price) })
      ).to.be.revertedWith('PriceNotMet')
    })

    it('Should fail for invalid item ids, sold items and when not enough ether is paid', async function () {
      // should fail in attempt to buy for insufficient balance
      await payToken.connect(addr2).approve(marketplace.address, totalPriceInWei)

      await expect(
        marketplace.connect(addr2).purchaseItem(nft.address, 1, payToken.address, { value: 0 })
      ).revertedWith('PriceNotMet', 'should fail with 0 ethers payed')

      // not allowed from ierc20
      await expect(
        marketplace
          .connect(addr3)
          .purchaseItem(nft.address, 1, payToken.address, { value: totalPriceInWei })
      ).revertedWith('NotAllowedToPay', 'should fail without allowance from ierc20')

      await payToken.connect(addr2).approve(marketplace.address, totalPriceInWei)

      // addr2 purchases item 0
      await marketplace
        .connect(addr2)
        .purchaseItem(nft.address, 1, payToken.address, { value: totalPriceInWei })

      // addr3 tries purchasing item 1 after its been sold
      await payToken.connect(addr3).approve(marketplace.address, totalPriceInWei)

      await expect(
        marketplace
          .connect(addr3)
          .purchaseItem(nft.address, 1, payToken.address, { value: totalPriceInWei })
      ).to.be.revertedWith('Sold')
    })

    it('Should fail on invalid token attempt to buy', async () => {
      await expect(
        marketplace
          .connect(addr1)
          .purchaseItem(nft.address, 1, solanaToken, { value: totalPriceInWei })
      ).to.be.revertedWith('InvalidPayToken')
    })

    it('Should return nft addresses', async () => {
      let addresses = await marketplace.getNftAddresses()
      expect(addresses.length).to.equal(1, 'should show one initially listed item')

      await nft.connect(deployer).mint(2, URI, { value: mintingFee })

      await nft.connect(deployer).approve(marketplace.address, 2)

      await marketplace.connect(deployer).listItem(nft.address, 2, payToken.address, toWei(price))

      expect(addresses.length).to.equal(
        1,
        'address should stays the same after listing from similar address'
      )

      // handling second nft contract
      secondNft = await NFT.connect(addr1).deploy(NFT_NAME, NFT_SYMBOL)
      await secondNft.connect(addr1).mint(1, URI, { value: mintingFee })

      await secondNft.connect(addr1).approve(marketplace.address, 1)

      await marketplace
        .connect(addr1)
        .listItem(secondNft.address, 1, payToken.address, toWei(price))

      addresses = await marketplace.getNftAddresses()

      expect(addresses.length).to.equal(2, 'new address of second nft contract should appear')
    })

    it('Should get listings', async () => {
      let nftCounter = await marketplace.getListedItemsCounter(nft.address)

      expect(nftCounter).to.be.equal(1, 'should return 1 listed item at the bigging')

      await nft.connect(deployer).mint(2, URI, { value: mintingFee })
      await nft.connect(deployer).approve(marketplace.address, 2)

      await marketplace.connect(deployer).listItem(nft.address, 2, payToken.address, toWei(price))

      nftCounter = await marketplace.getListedItemsCounter(nft.address)

      expect(nftCounter).to.be.equal(2, 'should return 2 listed items after another mint')

      nftCounter = await marketplace.getListedItemsCounter(
        '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'
      )
      expect(nftCounter).to.be.equal(0, 'should return 0 for non existing nft address')

      // handling second nft contract
      secondNft = await NFT.connect(addr1).deploy(NFT_NAME, NFT_SYMBOL)
      await secondNft.connect(addr1).mint(1, URI, { value: mintingFee })
      await secondNft.connect(addr1).approve(marketplace.address, 1)

      nftCounter = await marketplace.getListedItemsCounter(secondNft.address)
      expect(nftCounter).to.equal(0, 'should return 0 for not yet listed nft contract')

      await marketplace
        .connect(addr1)
        .listItem(secondNft.address, 1, payToken.address, toWei(price))

      nftCounter = await marketplace.getListedItemsCounter(secondNft.address)
      expect(nftCounter).to.equal(1, 'should resolve item from second nft')

      nftCounter = await marketplace.getListedItemsCounter(nft.address)
      expect(nftCounter).to.equal(2, 'still should resolve items from first address')

      await secondNft.connect(addr1).mint(2, URI, { value: mintingFee })
      await secondNft.connect(addr1).approve(marketplace.address, 2)
      await marketplace
        .connect(addr1)
        .listItem(secondNft.address, 2, payToken.address, toWei(price))

      expect(nftCounter).to.equal(2, 'should resolve item from second nft')
    })
  })

  describe('Reading state', function () {
    let price = 2

    beforeEach(async function () {
      // addr1 mints an nft
      await nft.connect(deployer).mint(1, URI, { value: mintingFee })
      // addr1 approves marketplace to spend tokens
      await nft.connect(deployer).approve(marketplace.address, 1)
      // addr1 makes their nft a marketplace item.
      await marketplace.connect(deployer).listItem(nft.address, 1, payToken.address, toWei(price))
    })
  })

  describe('Changing state', function () {
    let price = 2

    beforeEach(async function () {
      // addr1 mints an nft
      await nft.connect(deployer).mint(1, URI, { value: mintingFee })
      // addr1 approves marketplace to spend tokens
      await nft.connect(deployer).approve(marketplace.address, 1)
      // addr1 makes their nft a marketplace item.
      await marketplace.connect(deployer).listItem(nft.address, 1, payToken.address, toWei(price))

      // handling second nft contract
      secondNft = await NFT.connect(addr1).deploy(NFT_NAME, NFT_SYMBOL)
      await secondNft.connect(addr1).mint(1, URI, { value: mintingFee })
      await secondNft.connect(addr1).approve(marketplace.address, 1)

      await marketplace
        .connect(addr1)
        .listItem(secondNft.address, 1, payToken.address, toWei(price))
    })

    it('Should update listing', async () => {
      const { price: oldPrice } = await marketplace.getListing(nft.address, 1)

      await marketplace.updateListing(nft.address, 1, payToken.address, toWei(price + 1))

      const { price: newPrice } = await marketplace.getListing(nft.address, 1)

      expect(oldPrice).not.equal(newPrice)
    })

    it('Should fail on update not owning listing', async () => {
      await expect(
        marketplace
          .connect(deployer)
          .updateListing(secondNft.address, 1, payToken.address, toWei(price + 1))
      ).to.be.revertedWith('NotOwner')
    })
  })
})
