const { expect } = require('chai')
const { ethers } = require('hardhat')

const toWei = (num) => ethers.utils.parseEther(num.toString())
const fromWei = (num) => ethers.utils.formatEther(num)
const weiToNumber = (num, fixNum = 3) => parseFloat((+fromWei(num)).toFixed(fixNum))

describe('AynnMarkeplaceSC002', function () {
  let NFT
  let nft
  let secondNft
  let Marketplace
  let marketplace2
  let marketplace
  let deployer
  let addr1
  let addr2
  let addr3
  let addr4
  let addrs

  // 
  const freeValueNonce = 7

  // 5%
  let royaltyPercent = 5
  const mintingFee = toWei(0.1)
  const basisPointRoyalty = royaltyPercent * 100

  const fixedRoyalty = 10
  const fixedRoyaltyWei = toWei(fixedRoyalty)

  const zeroAddress = '0x0000000000000000000000000000000000000000'
  const nftRoyaltyPercent = 5

  let URI = 'sample URI'
  const NFT_NAME = 'AYNN_MARKETPLACE'
  const NFT_SYMBOL = 'AYNN'

  beforeEach(async function () {
    // Get the ContractFactories and Signers here.
    NFT = await ethers.getContractFactory('AynnNFT')

    Marketplace = await ethers.getContractFactory('AynnMarketplaceSC002')
      ;[deployer, addr1, addr2, addr3, addr4, ...addrs] = await ethers.getSigners()

    // To deploy our contracts
    nft = await NFT.connect(addr1).deploy(NFT_NAME, NFT_SYMBOL)
    await nft.setRoyalties(addr4.address, basisPointRoyalty)

    // To deploy our contracts
    secondNft = await NFT.connect(addr1).deploy(NFT_NAME, NFT_SYMBOL)
    await secondNft.setRoyalties(addr1.address, basisPointRoyalty)

    // First marketplace deploy
    marketplace = await Marketplace.connect(deployer).deploy(basisPointRoyalty, fixedRoyaltyWei, fixedRoyaltyWei)

    // Send second marketplace
    marketplace2 = await Marketplace.connect(addr3).deploy(basisPointRoyalty, fixedRoyaltyWei, fixedRoyaltyWei)
  })

  describe('Deployment', function () {
    it('Should track getRoyaltyAddress and getRoyaltyFees of the marketplace', async function () {
      expect(await marketplace.getRoyaltyAddress()).to.equal(deployer.address)

      // const basisPointRoyalty = royaltyPercent * 100
      let expectedRoyalty = 1 / 100 * royaltyPercent
      let marketplaceFee = await marketplace.getRoyaltyFees(toWei(1), 0, 2)
      expect(expectedRoyalty).to.equal(weiToNumber(marketplaceFee))

      expectedRoyalty = fixedRoyalty
      marketplaceFee = await marketplace.getRoyaltyFees(toWei(1), 1, 2)
      expect(expectedRoyalty).to.equal(weiToNumber(marketplaceFee))
    })
  })

  describe('Minting NFTs', function () {
    it('Should track each minted NFT', async function () {
      // addr1 mints an nft
      await nft.connect(addr1).mint(1, URI, { value: mintingFee })
      expect(await nft.totalSupply()).to.equal(1)
      expect(await nft.balanceOf(addr1.address)).to.equal(1)
      expect(await nft.tokenURI(1)).to.equal(URI)

      // addr1 mints an nft
      await nft.connect(addr1).mint(2, URI, { value: mintingFee })
      expect(await nft.totalSupply()).to.equal(2)
      expect(await nft.balanceOf(addr1.address)).to.equal(2)
      expect(await nft.tokenURI(2)).to.equal(URI)

      // addr1 mints an nft
      await nft.connect(addr1).mint(10, URI, { value: mintingFee })
      expect(await nft.totalSupply()).to.equal(3)
      expect(await nft.balanceOf(addr1.address)).to.equal(3)
      expect(await nft.tokenURI(10)).to.equal(URI)
    })
  })

  describe('Making marketplace items', function () {
    let price = 1
    beforeEach(async function () {
      // addr1 mints an nft
      await nft.connect(addr1).mint(1, URI, { value: mintingFee })
      // addr1 approves marketplace to spend nft
      await nft.connect(addr1).approve(marketplace.address, 1)
    })

    it('Should track newly created item, transfer NFT from seller to marketplace and emit ItemListed event', async function () {
      // addr1 offers their nft at a price of 1 ether
      await expect(marketplace.connect(addr1).listItem(nft.address, 1, toWei(price), freeValueNonce), "item listed with expected args")
        .to.emit(marketplace, 'ItemListed')
        .withArgs(nft.address, 1, addr1.address, marketplace.address, toWei(price))

      // Owner of NFT should still stay user
      expect(await nft.ownerOf(1)).to.equal(addr1.address, "Owner of item stays the user after listing")

      // Item count should now equal 1
      expect(await marketplace.getListingCounter(nft.address, 0)).to.equal(1)

      // Get item from items mapping then check fields to ensure they are correct
      const item = await marketplace.getListing(nft.address, 1)
      expect(item.nft).to.equal(nft.address)
      expect(item.tokenId).to.equal(1)
      expect(item.price).to.equal(toWei(price))
    })

    it('Should maintain getListingBy index', async function () {
      // addr1 offers their nft at a price of 1 ether
      const mintApproveList = async (tokenId, _nft = nft) => {
        await _nft.connect(addr1).mint(tokenId, URI, { value: mintingFee })
        await _nft.connect(addr1).approve(marketplace.address, tokenId)

        await expect(marketplace.connect(addr1).listItem(_nft.address, tokenId, toWei(price), freeValueNonce))
          .to.emit(marketplace, 'ItemListed')
          .withArgs(_nft.address, tokenId, addr1.address, marketplace.address, toWei(price))
      }

      const testTokenIds = [5, 10, 100]

      await Promise.all(testTokenIds.map(async x => (
        mintApproveList(x)
      )));

      // Item count should now equal 1
      expect(Number(await marketplace.getListingCounter(nft.address, 0))).greaterThanOrEqual(3)

      // Get item from items mapping then check fields to ensure they are correct
      testTokenIds.forEach(async (tokenId, idx) => {
        const itemByTokenId = await marketplace.getListing(nft.address, tokenId)
        const itemByIndex = await marketplace.getListingByIndex(nft.address, idx)

        expect(itemByTokenId).equal(itemByIndex)
      })

      // check second nft contract overlaps
      // (zeros before listed)
      await Promise.all(testTokenIds.map(async (tokenId, idx) => {
        const itemByTokenId = await marketplace.getListing(secondNft.address, tokenId)
        expect(itemByTokenId.nft).eq(zeroAddress, "Second nft getListing empty before mint")

        const itemByIndex = await marketplace.getListingByIndex(secondNft.address, idx)
        expect(itemByIndex.nft).eq(zeroAddress, "Second nft getListingByIndex empty before mint")
      }))

      // list and check second nft
      await mintApproveList(999, secondNft)

      const secondNftGl = await marketplace.getListing(secondNft.address, 999)
      const secondNftGli = await marketplace.getListingByIndex(secondNft.address, 0)

      expect(secondNftGl.nft).not.eq(zeroAddress, "Second nft getListing not empty")

      expect(secondNftGl.nft).equal(secondNftGli.nft, "Second nft nft address getListing and getListingByIndex are equal")
      expect(secondNftGl.tokenId).equal(secondNftGli.tokenId, "Second nft tokenId getListing and getListingByIndex are equal")
    })

    it('Should fail if price is set to zero', async function () {
      await expect(marketplace.connect(addr1).listItem(nft.address, 1, 0, freeValueNonce)).to.be.revertedWith(
        'PriceMustBeAboveZero'
      )
    })
  })

  describe('Transferring marketplace items and rights check', function () {
    let price = 1

    beforeEach(async function () {
      // addr1 mints an nft
      await nft.connect(addr1).mint(1, URI, { value: mintingFee })
      // addr1 approves marketplace to spend nft
      await nft.connect(addr1).approve(marketplace.address, 1)
    })

    it('Check if owner of listed item still can transfer', async function () {
      await marketplace.connect(addr1).listItem(nft.address, 1, price, freeValueNonce, { value: mintingFee })
      const owner = await nft.ownerOf(1)
      expect(owner).to.equal(addr1.address, 'Owner stays the same after listing')
    })
  })

  describe('Purchasing marketplace items', function () {
    let price = 2
    let royalty = (royaltyPercent / 100) * price
    let totalPriceInWei

    beforeEach(async function () {
      // addr1 mints an nft
      await nft.connect(addr1).mint(1, URI, { value: mintingFee })
      // addr1 approves marketplace to spend tokens
      await nft.connect(addr1).approve(marketplace.address, 1)
      // addr1 makes their nft a marketplace item.
      await marketplace.connect(addr1).listItem(nft.address, 1, toWei(price), freeValueNonce)

      totalPriceInWei = await marketplace.getListingPriceWithRoyalties(nft.address, 1, freeValueNonce)
    })

    it('Should update item as sold, pay seller, transfer NFT to buyer, charge fees and emit a Purchased event', async function () {
      // const sellerInitialEthBalance = await deployer.getBalance()
      const sellerBalanceBefore = await addr1.getBalance()
      const royaltyBalanceBefore = await addr4.getBalance()

      // fetch items total price (market fees + item price)

      await await expect(
        marketplace.connect(addr2).purchaseItem(nft.address, 1, freeValueNonce, { value: totalPriceInWei }),
        "Should be purchased with expected args"
      )
        .to.emit(marketplace, 'ItemPurchased')
        .withArgs(nft.address, 1, addr1.address, addr2.address, toWei(price))

      // Seller should receive payment for the price of the NFT sold.
      // const sellerFinalEthBal = await deployer.getBalance()
      const sellerBalanceAfter = await addr1.getBalance()
      const royaltyBalanceAfter = await addr4.getBalance()

      expect((await marketplace.getListing(nft.address, 1)).sold, "Item should be marked as sold").to.equal(true)

      // Royalty received from nft contract ERC2981Proto
      const nftRoyaltyInfo = await nft.royaltyInfo(1, toWei(price))
      let expectedNftRoyalty = (nftRoyaltyPercent / 100) * price

      expect(addr4.address).to.equal(nftRoyaltyInfo[0], 'Nft royalty address wrong')

      expect(expectedNftRoyalty.toFixed(1)).to.equal(
        fromWei(nftRoyaltyInfo[1]),
        'Nft royalty amount wrong'
      )

      expect(weiToNumber(sellerBalanceAfter)).to.equal(
        weiToNumber(sellerBalanceBefore) + price,
        'Seller receives price'
      )

      expect(weiToNumber(royaltyBalanceAfter)).to.equal(
        weiToNumber(royaltyBalanceBefore) + royalty,
        'Royalty account receives royalty'
      )

      // The owner of an item is addr2 now
      expect(await nft.ownerOf(1), "Owner is addr2 now").to.equal(addr2.address)
    })

    it('Should fail for invalid item id', async () => {
      await expect(
        marketplace.connect(addr2).purchaseItem(nft.address, 2, freeValueNonce, { value: totalPriceInWei })
      ).to.be.revertedWith('NotListed')
    })

    it('Should fail with wrong amount of money passed', async () => {
      // Fails when not enough ether is paid with the transaction.
      // In this instance, fails when buyer only sends enough ether to cover the price of the nft
      // not the additional market fee.
      await expect(
        marketplace.connect(addr2).purchaseItem(nft.address, 1, freeValueNonce, { value: toWei(price) })
      ).to.be.revertedWith('PriceNotMet')
    })

    it('Should fail for invalid item ids, sold items and when not enough ether is paid', async function () {
      // should fail in attempt to buy for insufficient balance

      await expect(
        marketplace.connect(addr2).purchaseItem(nft.address, 1, freeValueNonce, { value: 0 })
      ).revertedWith('PriceNotMet', 'should fail with 0 ethers payed')

      // addr2 purchases item 0
      await marketplace.connect(addr2).purchaseItem(nft.address, 1, freeValueNonce, { value: totalPriceInWei })

      // addr3 tries purchasing item 1 after its been sold
      await expect(
        marketplace.connect(addr3).purchaseItem(nft.address, 1, freeValueNonce, { value: totalPriceInWei })
      ).to.be.revertedWith('Sold')
    })

    it('Should return nft addresses', async () => {
      let addresses = await marketplace.getNftAddresses()

      expect(addresses.length).to.equal(1, 'should show one initially listed item')

      await nft.connect(addr1).mint(2, URI, { value: mintingFee })

      await nft.connect(addr1).approve(marketplace.address, 2)

      await marketplace.connect(addr1).listItem(nft.address, 2, toWei(price), freeValueNonce)

      expect(addresses.length).to.equal(
        1,
        'address should stays the same after listing from similar address'
      )

      // handling second nft contract
      secondNft = await NFT.connect(addr1).deploy(NFT_NAME, NFT_SYMBOL)

      await secondNft.connect(addr1).mint(1, URI, { value: mintingFee })

      await secondNft.connect(addr1).approve(marketplace.address, 1)

      await marketplace.connect(addr1).listItem(secondNft.address, 1, toWei(price), freeValueNonce)

      addresses = await marketplace.getNftAddresses()

      expect(addresses.length).to.equal(2, 'new address of second nft contract should appear')
    })

    it('Should get listings', async () => {
      let nftCounter = await marketplace.getListingCounter(nft.address, 0)

      expect(nftCounter).to.be.equal(1, 'should return 1 listed item at the bigging')

      await nft.connect(addr1).mint(2, URI, { value: mintingFee })
      await nft.connect(addr1).approve(marketplace.address, 2)

      await marketplace.connect(addr1).listItem(nft.address, 2, toWei(price), freeValueNonce)

      nftCounter = await marketplace.getListingCounter(nft.address, 0)

      expect(nftCounter).to.be.equal(2, 'should return 2 listed items after another mint')

      nftCounter = await marketplace.getListingCounter(
        '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
        0
      )
      expect(nftCounter).to.be.equal(0, 'should return 0 for non existing nft address')

      // handling second nft contract
      secondNft = await NFT.connect(addr1).deploy(NFT_NAME, NFT_SYMBOL)
      await secondNft.connect(addr1).mint(1, URI, { value: mintingFee })
      await secondNft.connect(addr1).approve(marketplace.address, 1)

      nftCounter = await marketplace.getListingCounter(secondNft.address, 0)
      expect(nftCounter).to.equal(0, 'should return 0 for not yet listed nft contract')

      await marketplace.connect(addr1).listItem(secondNft.address, 1, toWei(price), freeValueNonce)

      nftCounter = await marketplace.getListingCounter(secondNft.address, 0)
      expect(nftCounter).to.equal(1, 'should resolve item from second nft')

      nftCounter = await marketplace.getListingCounter(nft.address, 0)
      expect(nftCounter).to.equal(2, 'still should resolve items from first address')

      await secondNft.connect(addr1).mint(2, URI, { value: mintingFee })
      await secondNft.connect(addr1).approve(marketplace.address, 2)
      await marketplace.connect(addr1).listItem(secondNft.address, 2, toWei(price), freeValueNonce)

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
      await marketplace.connect(deployer).listItem(nft.address, 1, toWei(price), freeValueNonce)
    })
  })

  describe('Changing state', function () {
    let price = 2

    beforeEach(async function () {
      // addr1 mints an nft
      await nft.connect(addr1).mint(1, URI, { value: mintingFee })
      // addr1 approves marketplace to spend tokens
      await nft.connect(addr1).approve(marketplace.address, 1)
      // addr1 makes their nft a marketplace item.
      await marketplace.connect(addr1).listItem(nft.address, 1, toWei(price), freeValueNonce)

      // handling second nft contract
      secondNft = await NFT.connect(addr2).deploy(NFT_NAME, NFT_SYMBOL)
      await secondNft.connect(addr2).mint(1, URI, { value: mintingFee })
      await secondNft.connect(addr2).approve(marketplace.address, 1)
      await marketplace.connect(addr2).listItem(secondNft.address, 1, toWei(price), freeValueNonce)
    })

    it('Should update listing', async () => {
      const { price: oldPrice } = await marketplace.getListing(nft.address, 1)

      await marketplace.connect(addr1).updateListing(nft.address, 1, toWei(price + 1))

      const { price: newPrice } = await marketplace.getListing(nft.address, 1)

      expect(oldPrice).not.equal(newPrice)
    })

    it('Should fail on update not owning listing', async () => {
      await expect(
        marketplace.connect(deployer).updateListing(secondNft.address, 1, toWei(price + 1))
      ).to.be.revertedWith('NotOwner')
    })
  })

  describe('Empty contract checks', function () {
    let price = 2

    beforeEach(async function () {
      // addr1 mints an nft
      await nft.connect(addr1).mint(1, URI, { value: mintingFee })
      // addr1 approves marketplace to spend tokens
      await nft.connect(addr1).approve(marketplace.address, 1)
    })



    it('Should return listing counter', async () => {
      const counter = await marketplace.getListingCounter(nft.address, 0);
    })

  })

  describe('Offers', function () {
    let price = 10
    let offerPrice = 2

    beforeEach(async function () {
      // addr1 mints an nft
      await nft.connect(addr1).mint(1, URI, { value: mintingFee })
      // addr1 approves marketplace to spend tokens
      await nft.connect(addr1).approve(marketplace.address, 1)
      // addr1 makes their nft a marketplace item.
      await marketplace.connect(addr1).listItem(nft.address, 1, toWei(price), freeValueNonce)
    })

    it('Should fail on attempt without money', async () => {
      await expect(
        marketplace.connect(addr2).makeOffer(nft.address, 1, toWei(offerPrice), freeValueNonce)
      ).to.be.revertedWith("PriceNotMet")
    })

    it('Should fail on attempt to offer sold item', async () => {
      const priceWithRoyalties = await marketplace.getListingPriceWithRoyalties(nft.address, 1, freeValueNonce)
      await marketplace.connect(addr2).purchaseItem(nft.address, 1, freeValueNonce, { value: priceWithRoyalties });

      await expect(
        marketplace.connect(addr2).makeOffer(nft.address, 1, toWei(offerPrice), freeValueNonce, { value: offerPrice })
      ).to.be.revertedWith("Sold")
    })

    it('Should get item by index', async () => {
      const mintApproveList = async (_tokenId, _nft = nft, _connect = addr1) => {
        await _nft.connect(_connect).mint(_tokenId, URI, { value: mintingFee })
        await _nft.connect(_connect).approve(marketplace.address, _tokenId)

        await expect(marketplace.connect(_connect).listItem(_nft.address, _tokenId, toWei(price), freeValueNonce))
          .to.emit(marketplace, 'ItemListed')
          .withArgs(_nft.address, _tokenId, _connect.address, marketplace.address, toWei(price))
      }

      const thirdNft = await NFT.connect(addr4).deploy(NFT_NAME, NFT_SYMBOL)

      await mintApproveList(100)
      await mintApproveList(400)
      await mintApproveList(2, thirdNft, addr4)
      await mintApproveList(4, thirdNft, addr4)

      const priceWithRoyalties = await marketplace.getOfferPriceWithRoyalties(nft.address, 1, toWei(offerPrice), 1, freeValueNonce);

      await expect(
        marketplace.connect(addr2).makeOffer(nft.address, 1, toWei(offerPrice), freeValueNonce, { value: priceWithRoyalties })
      ).not.to.be.reverted;

      await expect(
        marketplace.connect(addr2).makeOffer(nft.address, 400, toWei(offerPrice), freeValueNonce, { value: priceWithRoyalties })
      ).not.to.be.reverted;

      await expect(
        marketplace.connect(addr3).makeOffer(nft.address, 400, toWei(offerPrice), freeValueNonce, { value: priceWithRoyalties })
      ).not.to.be.reverted;

      await expect(
        marketplace.connect(addr4).makeOffer(thirdNft.address, 4, toWei(offerPrice), freeValueNonce, { value: priceWithRoyalties })
      ).not.to.be.reverted;

      await expect(
        marketplace.connect(addr4).makeOffer(thirdNft.address, 2, toWei(offerPrice), freeValueNonce, { value: priceWithRoyalties })
      ).not.to.be.reverted;

      await expect(
        marketplace.connect(addr2).makeOffer(thirdNft.address, 4, toWei(offerPrice), freeValueNonce, { value: priceWithRoyalties })
      ).not.to.be.reverted;

      // check counters
      var firstNftOfferCounter = await marketplace.getOfferCounter(nft.address, 1)
      expect(1).equal(firstNftOfferCounter)

      firstNftOfferCounter = await marketplace.getOfferCounter(nft.address, 400)
      expect(2).equal(firstNftOfferCounter)

      var thirdNftOfferCounter = await marketplace.getOfferCounter(thirdNft.address, 4)
      expect(2).equal(thirdNftOfferCounter)

      thirdNftOfferCounter = await marketplace.getOfferCounter(thirdNft.address, 2)
      expect(1).equal(thirdNftOfferCounter)

      // check getOffer
      var nftOffer = await marketplace.getOffer(nft.address, 1, addr2.address)
      expect(1).equal(nftOffer.tokenId)

      var nftOfferByIndex = await marketplace.getOfferByIndex(nft.address, 1, 0)
      expect(nftOffer.tokenId).equal(nftOfferByIndex.tokenId)

      nftOffer = await marketplace.getOffer(nft.address, 400, addr2.address)
      expect(400).equal(nftOffer.tokenId)

      var nftOffer2 = await marketplace.getOffer(nft.address, 400, addr3.address)
      expect(400).equal(nftOffer.tokenId)

      nftOfferByIndex = await marketplace.getOfferByIndex(nft.address, 400, 0)

      expect(nftOffer.tokenId).equal(nftOfferByIndex.tokenId)

      nftOfferByIndex = await marketplace.getOfferByIndex(nft.address, 400, 1)

      expect(nftOffer2.tokenId).equal(nftOfferByIndex.tokenId)

      nftOfferByIndex = await marketplace.getOfferByIndex(nft.address, 400, 2)
      expect(nftOfferByIndex.tokenId).equal(0)
    });

    it('Should make offer and cancel when values are correct', async () => {
      let offererBalanceBefore = await addr2.getBalance()

      await marketplace.withdraw(addr3.address);

      const priceWithRoyalties = await marketplace.getOfferPriceWithRoyalties(nft.address, 1, toWei(offerPrice), 1, freeValueNonce);

      await expect(
        marketplace.connect(addr2).makeOffer(nft.address, 1, toWei(offerPrice), freeValueNonce, { value: priceWithRoyalties })
      ).not.to.be.reverted;

      const marketplaceBalanceAfter = await ethers.provider.getBalance(marketplace.address)

      let offererBalanceAfter = await addr2.getBalance();

      const offererBalanceDelta = offererBalanceBefore.sub(offererBalanceAfter)

      expect(weiToNumber(marketplaceBalanceAfter)).to.greaterThanOrEqual(
        offerPrice, 'Marketplace should receive offerPrice'
      )

      // Check user account after offer made
      expect(weiToNumber(offererBalanceDelta, 3))
        .to.equal(weiToNumber(priceWithRoyalties, 3),
          'After offer user should send reserved amount to marketplace');

      offererBalanceBefore = await addr2.getBalance()
      await expect(
        marketplace.connect(addr2).cancelOffer(nft.address, 1)
      ).not.to.be.reverted

      offererBalanceAfter = await addr2.getBalance();

      expect(weiToNumber(offererBalanceAfter, 3))
        .to.equal(weiToNumber(offererBalanceBefore, 3) + offerPrice,
          'After offer cancel user should return his money back');
    })

    it('Should make offer and accept offer if everything is ok', async () => {
      await marketplace.withdraw(addr3.address);

      const priceWithRoyalties = await marketplace.getOfferPriceWithRoyalties(nft.address, 1, toWei(offerPrice), 0, freeValueNonce);

      // addr2 wants to buy from addr1
      await expect(
        marketplace.connect(addr2).makeOffer(nft.address, 1, toWei(offerPrice), freeValueNonce, { value: priceWithRoyalties })
      ).not.to.be.reverted

      const sellerBalanceBefore = await addr1.getBalance();

      await expect(
        marketplace.connect(addr1).acceptOffer(nft.address, 1, addr2.address, freeValueNonce)
      ).not.to.be.reverted

      const sellerBalanceAfter = await addr1.getBalance();
      const sellerBalanceDelta = sellerBalanceAfter.sub(sellerBalanceBefore)

      expect(await nft.ownerOf(1)).to.equal(addr2.address, 'Next owner should be offer author');

      expect(weiToNumber(sellerBalanceDelta, 2))
        .equal(offerPrice,
          'Seller should receive money for offer');
    })
  })

  describe('Royalty system', function () {
    let price = 10
    let offerPrice = 2

    beforeEach(async function () {
      // addr1 mints an nft
      await nft.connect(addr1).mint(1, URI, { value: mintingFee })
      // addr1 approves marketplace to spend tokens
      await nft.connect(addr1).approve(marketplace.address, 1)
      // addr1 makes their nft a marketplace item.
      await marketplace.connect(addr1).listItem(nft.address, 1, toWei(price), freeValueNonce)
    })

    it('Price and price + royalties should be equal when secret nonce passed', async () => {
      const sellerNftRoyalty = price / 100 * royaltyPercent

      const priceFixed = await marketplace.getListingPriceWithRoyalties(nft.address, 1, freeValueNonce)
      const pricePercent = await marketplace.getListingPriceWithRoyalties(nft.address, 1, freeValueNonce)

      expect(price + sellerNftRoyalty).to.equal(weiToNumber(priceFixed))
      expect(price + sellerNftRoyalty).to.equal(weiToNumber(pricePercent))

      const offerFixed = await marketplace.getOfferPriceWithRoyalties(nft.address, 1, toWei(price), 0, freeValueNonce)
      const offerPercent = await marketplace.getOfferPriceWithRoyalties(nft.address, 1, toWei(price), 1, freeValueNonce)
      expect(price + sellerNftRoyalty).to.equal(weiToNumber(offerFixed))
      expect(price + sellerNftRoyalty).to.equal(weiToNumber(offerPercent))
    })

    it('Price and price + royalties should be different in case of different nonce', async () => {
      const sellerNftRoyalty = price / 100 * royaltyPercent

      const priceFixedFree = await marketplace.getListingPriceWithRoyalties(nft.address, 1, freeValueNonce)
      const priceFixedPaid = await marketplace.getListingPriceWithRoyalties(nft.address, 1, 10001)

      expect(weiToNumber(priceFixedFree)).to.be.lessThan(weiToNumber(priceFixedPaid))

      var royaltyFees = await marketplace.getRoyaltyFees(toWei(price), 0, 10001)

      expect(price + weiToNumber(royaltyFees) + sellerNftRoyalty).to.be.equal(weiToNumber(priceFixedPaid))
    })
  })
})
