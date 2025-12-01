const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");
const { emptyNonce, createNonce, toWei, toFixed, weiToNumber, fromWei } = require("./testUtils")


describe('DistributedMarketplace tests', () => {
  /** owner is deployer 
   * @type {*} */
  let distributedMarketplaceInstance;

  /** owner is addr3 
   * @type {*}
   * */
  let distributedMarketplaceInstance2;

  let transmitterControllerInstance;
  let transmitter721_1155Instance;
  let offerStoreInstance;
  let listingStoreInstance;

  /** Owner is addr1
   * @type {*}
   * */
  let erc721Instance1;

  /** Owner is addr2
   * @type {*}
   * */
  let erc721Instance2;

  /** Owner is addr1
   * @type {*}
   * */
  let erc1155Instance1;

  /** Owner is addr2
   * @type {*}
   * */
  let erc1155Instance2;

  let deployer

  let addr1
  let addr2
  let addr3
  let addr4
  let addrs

  beforeEach(async () => {
    [deployer, addr1, addr2, addr3, addr4, ...addrs] = await ethers.getSigners();

    let distributedMarketplaceFactory = await ethers.getContractFactory('DistributedMarketplace');

    distributedMarketplaceInstance = await distributedMarketplaceFactory.deploy(
      deployer.address, 500, toWei(2), toWei(2)
    );

    distributedMarketplaceInstance2 = await distributedMarketplaceFactory.deploy(
      deployer.address, 500, toWei(2), toWei(2)
    );

    let transmitterControllerFactory = await ethers.getContractFactory('TransmitterController');
    transmitterControllerInstance = await transmitterControllerFactory.deploy();
    await transmitterControllerInstance.setRemoteAllowance(distributedMarketplaceInstance.address, true)
    await transmitterControllerInstance.setRemoteAllowance(distributedMarketplaceInstance2.address, true)

    let transmitter721_1155Factory = await ethers.getContractFactory('Transmitter721_1155');
    transmitter721_1155Instance = await transmitter721_1155Factory.deploy();
    await transmitter721_1155Instance.setRemoteAllowance(transmitterControllerInstance.address, true)

    await transmitterControllerInstance.setTransmitterAddress(0, transmitter721_1155Instance.address)

    let offerStoreFactory = await ethers.getContractFactory('OfferStore');
    offerStoreInstance = await offerStoreFactory.deploy();

    await offerStoreInstance.setRemoteAllowance(distributedMarketplaceInstance.address, true)
    await offerStoreInstance.setRemoteAllowance(distributedMarketplaceInstance2.address, true)

    let listingStoreFactory = await ethers.getContractFactory('ListingStore')
    listingStoreInstance = await listingStoreFactory.deploy()

    await listingStoreInstance.setRemoteAllowance(distributedMarketplaceInstance.address, true);
    await listingStoreInstance.setRemoteAllowance(distributedMarketplaceInstance2.address, true);


    // nft
    let erc721Factory = await ethers.getContractFactory('AynnNFTPayable005');

    // instance 1
    erc721Instance1 = await erc721Factory.connect(addr1).deploy("AYNN", "AYNN1", addr4.address, 1000);
    await erc721Instance1.mint(1, "https://token-1-uri.com")
    await erc721Instance1.mint(2, "https://token-2-uri.com")
    await erc721Instance1.mint(10, "https://token-10-uri.com")

    // instance 2
    erc721Instance2 = await erc721Factory.connect(addr2).deploy("AYNN", "AYNN1", addr2.address, 1000);
    await erc721Instance2.mint(1, "https://token-1-uri.com")
    await erc721Instance2.mint(2, "https://token-2-uri.com")

    let erc1155Factory = await ethers.getContractFactory('Aynn1155Folder_001');

    // instance 1
    erc1155Instance1 = await erc1155Factory.connect(addr1).deploy("#hash1", addr4.address, 1000);
    await erc1155Instance1.mint(addr1.address, 1, 10, [])
    await erc1155Instance1.mint(addr1.address, 2, 20, [])
    await erc1155Instance1.mint(addr1.address, 3, 3, [])

    erc1155Instance2 = await erc1155Factory.connect(addr2).deploy("#hash2", addr4.address, 1000);
    await erc1155Instance2.mint(addr2.address, 1, 10, [])
    await erc1155Instance2.mint(addr2.address, 2, 20, [])
    await erc1155Instance2.mint(addr2.address, 3, 3, [])

    // startup configuration
    await distributedMarketplaceInstance.setUnitAddress(0, listingStoreInstance.address);
    await distributedMarketplaceInstance.setUnitAddress(1, offerStoreInstance.address);
    await distributedMarketplaceInstance.setUnitAddress(2, transmitterControllerInstance.address);

    await distributedMarketplaceInstance2.setUnitAddress(0, listingStoreInstance.address);
    await distributedMarketplaceInstance2.setUnitAddress(1, offerStoreInstance.address);
    await distributedMarketplaceInstance2.setUnitAddress(2, transmitterControllerInstance.address);
  })

  it('should respect 1155 create listing royalties', async () => {
    const listingRoyalty = 2
    // 10 is maximum%
    await distributedMarketplaceInstance.setRoyalties(addrs[0].address, 1000, toWei(listingRoyalty), toWei(listingRoyalty))

    const listing = {
      nft: erc1155Instance1.address,
      tokenId: 1,
      price: toWei(20),
      value: 10,
      nonce: emptyNonce
    }

    await erc1155Instance1.setApprovalForAll(transmitter721_1155Instance.address, true)

    await expect(distributedMarketplaceInstance.connect(addr1).createListing(
      listing.nft,
      listing.tokenId,
      listing.price,
      listing.value,
      listing.nonce
    )).to.be.revertedWith("PriceNotMet")

    const [, value] = await distributedMarketplaceInstance.royaltyInfo([
      0,
      listing.price,
      listing.value,
      listing.nonce
    ])

    const addrs0BalanceBefore = await addrs[0].getBalance()

    await expect(distributedMarketplaceInstance.connect(addr1).createListing(
      listing.nft,
      listing.tokenId,
      listing.price,
      listing.value,
      listing.nonce,
      { value }
    )).not.to.be.reverted

    const addrs0BalanceAfter = await addrs[0].getBalance()

    // await distributedMarketplaceInstance.setRoyalties(addrs[0].address, 1000, toWei(2), toWei(2))
    // addrs[0] should receive listing royalty (wei2 * value)
    expect(weiToNumber(addrs0BalanceBefore) + listingRoyalty * listing.value).to.eq(weiToNumber(addrs0BalanceAfter))
  })

  it('should respect 721 create listing royalties', async () => {
    const listingRoyalty = 2
    // 10 is maximum%
    await distributedMarketplaceInstance.setRoyalties(addrs[0].address, 1000, toWei(listingRoyalty), toWei(listingRoyalty))

    const listing = {
      nft: erc721Instance1.address,
      tokenId: 1,
      price: toWei(20),
      value: 1,
      nonce: emptyNonce
    }

    await erc721Instance1.approve(transmitter721_1155Instance.address, listing.tokenId)

    await expect(distributedMarketplaceInstance.connect(addr1).createListing(
      listing.nft,
      listing.tokenId,
      listing.price,
      listing.value,
      listing.nonce
    )).to.be.revertedWith("PriceNotMet")

    const [, value] = await distributedMarketplaceInstance.royaltyInfo([
      0,
      listing.price,
      listing.value,
      listing.nonce
    ])

    const addrs0BalanceBefore = await addrs[0].getBalance()

    await expect(distributedMarketplaceInstance.connect(addr1).createListing(
      listing.nft,
      listing.tokenId,
      listing.price,
      listing.value,
      listing.nonce,
      { value }
    )).not.to.be.reverted

    const addrs0BalanceAfter = await addrs[0].getBalance()

    // await distributedMarketplaceInstance.setRoyalties(addrs[0].address, 1000, toWei(2), toWei(2))
    // addrs[0] should receive listing royalty (wei2)
    expect(weiToNumber(addrs0BalanceBefore) + listingRoyalty).to.eq(weiToNumber(addrs0BalanceAfter))
  })

  it('should get transmitter address', async () => {
    var address = await distributedMarketplaceInstance.getUnitAddress(2)
    expect(transmitterControllerInstance.address).to.eq(address)
  })

  /**
   * Creates 721 listing
   * author is addr1
   *
   * @param {number} [_value=0] value
   * @return {{
   * nft: string,
   * tokenId: number,
   * price: BigNumber,
   * value: number,
   * nonce: [
   * number,
   * import("ethers").Bytes
   * ]
   * }} listing
   */
  const create721listing = async (_value = 1, _tokenId = 1) => {
    const listing = {
      nft: erc721Instance1.address,
      tokenId: _tokenId,
      price: toWei(20),
      value: _value,
      nonce: emptyNonce
    }

    const [, value] = await distributedMarketplaceInstance.royaltyInfo(
      [2, listing.price, listing.value, listing.nonce]
    )

    await erc721Instance1.approve(transmitter721_1155Instance.address, listing.tokenId)

    await expect(distributedMarketplaceInstance.connect(addr1).createListing(
      listing.nft,
      listing.tokenId,
      listing.price,
      listing.value,
      listing.nonce,
      { value }
    )).not.to.be.reverted

    const foundListing = await distributedMarketplaceInstance.getListing(
      listing.nft,
      listing.tokenId
    )

    expect(foundListing.tokenId, 'token id should be eq').eq(listing.tokenId)
    expect(foundListing.nft, 'nft address should be eq').eq(listing.nft)
    expect(foundListing.price, 'price should be eq').eq(foundListing.price)
    expect(foundListing.value, 'price should be eq').eq(foundListing.value)

    return listing
  }

  it('should create 721 listing', async () => {
    const listingCounterStart = await distributedMarketplaceInstance.getListingCounter(addr1.address)

    expect(0).eq(listingCounterStart)

    const listing1 = await create721listing(1, 1)

    await create721listing(1, 10)

    var foundListing = await distributedMarketplaceInstance.getListing(listing1.nft, listing1.tokenId)

    await expect(distributedMarketplaceInstance.connect(addr1).createListing(
      listing1.nft,
      listing1.tokenId,
      listing1.price,
      listing1.value,
      listing1.nonce
    )).to.be.revertedWith('AlreadyListed')

    let purchaseValue = await distributedMarketplaceInstance.getListingPriceWithRoyalties(
      listing1.nft,
      listing1.tokenId,
      listing1.value,
      emptyNonce
    )

    await expect(distributedMarketplaceInstance.connect(addr3).purchaseItem(
      listing1.nft,
      listing1.tokenId,
      listing1.value,
      listing1.nonce,
      { value: purchaseValue }
    ), 'another user should be able to buy listed item').not.to.be.reverted

    let [, listingFee] = (await distributedMarketplaceInstance.royaltyInfo(
      [2, listing1.price, listing1.value, listing1.nonce])
    ) ?? _value

    await erc721Instance1.connect(addr3).approve(transmitter721_1155Instance.address, listing1.tokenId)

    await expect(distributedMarketplaceInstance.connect(addr3).createListing(
      listing1.nft,
      listing1.tokenId,
      toWei(50),
      listing1.value,
      listing1.nonce,
      { value: listingFee }
    ), 'and buyer should be able to list item again').not.to.be.reverted

    const listingCounter = await distributedMarketplaceInstance.getListingCounter(listing1.nft)

    expect(3, 'listing counter should be correct').to.eq(listingCounter)

    // second item should be for token 10
    foundListing = await distributedMarketplaceInstance.getListingByIndex(listing1.nft, 1)
    expect(10, 'second item should be token 10').eq(foundListing.tokenId)

    // should get 3rd listing (with price 50)
    foundListing = await distributedMarketplaceInstance.getListingByIndex(listing1.nft, 2)
    expect(50, 'should get third listing').eq(weiToNumber(foundListing.price))
  })

  it('should update listing', async () => {
    var listing = await create721listing()

    listing.price = listing.price + 1
    listing.value = listing.value + 1

    await expect(distributedMarketplaceInstance.updateListing(listing.nft, listing.tokenId, listing.price, listing.value))
      .to.be.revertedWith("NotOwner")

    await expect(distributedMarketplaceInstance.connect(addr1).updateListing(listing.nft, listing.tokenId, listing.price, listing.value))
      .not.to.be.reverted

    var foundListing = await distributedMarketplaceInstance.getListing(listing.nft, listing.tokenId)

    expect(listing.price).eq(foundListing.price)
    expect(listing.value).eq(foundListing.value)
  })

  it('should delete listing', async () => {
    var listing = await create721listing()

    await expect(distributedMarketplaceInstance.deleteListing(listing.nft, listing.tokenId))
      .to.be.revertedWith("NotOwner")

    await expect(distributedMarketplaceInstance.connect(addr1).deleteListing(listing.nft, listing.tokenId))
      .not.to.be.reverted

    var foundListing = await distributedMarketplaceInstance.getListing(listing.nft, listing.tokenId)

    expect(0).eq(foundListing.price)
    expect(false).eq(foundListing.sold)
  })

  it('should purchase 721 listing', async () => {
    await distributedMarketplaceInstance.setRoyalties(addrs[0].address, 1000, toWei(2), toWei(2))

    const addrs0BalanceBefore = await addrs[0].getBalance()

    const listing = await create721listing()

    var value = await distributedMarketplaceInstance.getListingPriceWithRoyalties(listing.nft, listing.tokenId, 1, listing.nonce);

    // seller cannot buy
    await expect(distributedMarketplaceInstance.connect(addr1).purchaseItem(listing.nft, listing.tokenId, 1, listing.nonce, { value }))
      .to.be.revertedWith("SellerCannotBuy")

    await expect(distributedMarketplaceInstance.connect(addr3).purchaseItem(listing.nft, listing.tokenId, 1, listing.nonce))
      .to.be.revertedWith("PriceNotMet")

    const addr4BalanceBefore = await addr4.getBalance()
    const addr1BalanceBefore = await addr1.getBalance()

    await expect(distributedMarketplaceInstance.connect(addr3).purchaseItem(listing.nft, listing.tokenId, 1, listing.nonce, { value }))
      .not.to.be.reverted

    // check listing is sold and new owner set
    var foundListing = await distributedMarketplaceInstance.getListing(listing.nft, listing.tokenId)

    expect(true).to.eq(foundListing.sold)
    expect(addr3.address).to.eq(foundListing.owner)

    // check addr3 is new owner of item
    var owner = await erc721Instance1.ownerOf(listing.tokenId)
    expect(addr3.address).to.eq(owner)

    // check addr4 received 10% royalty
    const addr4BalanceAfter = await addr4.getBalance()
    expect(weiToNumber(addr4BalanceBefore) + (10 / 100) * weiToNumber(listing.price)).to.eq(weiToNumber(addr4BalanceAfter))

    // check addr1 received payment
    const addr1BalanceAfter = await addr1.getBalance()
    expect(weiToNumber(addr1BalanceBefore) + weiToNumber(listing.price)).to.eq(weiToNumber(addr1BalanceAfter))

    //addrs[0] should receive listing (2) + sell royalty (10%) 
    const addrs0BalanceAfter = await addrs[0].getBalance()
    expect(weiToNumber(addrs0BalanceBefore) + 2 + (10 / 100) * weiToNumber(listing.price)).to.eq(weiToNumber(addrs0BalanceAfter))

  })

  /**
   * Create 1155 listing
   * owner - addr1
   * 
   * @param {{
   * _amount: number
   * }} { _amount = 10 }
   * @return {{
   * nft: string,
   * tokenId: number,
   * price: BigNumber,
   * value: number,
   * nonce: [
   * number,
   * import("ethers").Bytes
   * ]
   * }} 
   */
  const create1155listing = async (props = { _amount: 10 }) => {
    const listing = {
      nft: erc1155Instance1.address,
      tokenId: 1,
      price: toWei(20),
      value: props._amount,
      nonce: emptyNonce,
    }

    const [, value] = await distributedMarketplaceInstance.royaltyInfo([
      2,
      listing.price,
      listing.value,
      listing.nonce
    ])

    // 10 tokens with token id appear here
    await erc1155Instance1.mint(addr1.address, listing.tokenId, listing.value, [])

    await erc1155Instance1.setApprovalForAll(transmitter721_1155Instance.address, true)

    await expect(distributedMarketplaceInstance.connect(addr1).createListing(
      listing.nft,
      listing.tokenId,
      listing.price,
      listing.value,
      listing.nonce,
      { value }
    )).not.to.be.reverted

    return listing
  }

  it('should create 1155 listing', async () => {
    const listing = await create1155listing()

    var foundListing = await distributedMarketplaceInstance.getListing(listing.nft, listing.tokenId)

    expect(listing.nft).to.eq(foundListing.nft)
    expect(listing.price).to.eq(foundListing.price)
    expect(listing.value).to.eq(foundListing.value)

    await expect(distributedMarketplaceInstance.connect(addr1).createListing(
      listing.nft,
      listing.tokenId,
      listing.price,
      listing.value,
      listing.nonce
    )).to.be.revertedWith('AlreadyListed')
  })

  it('should purchase 1155 listing', async () => {
    const listingOfferFee = 2
    const itemsToList = 10
    const itemsToBuy = 2;

    await distributedMarketplaceInstance.setRoyalties(addrs[0].address, 1000, toWei(listingOfferFee), toWei(listingOfferFee))

    const addrs0BalanceBefore = await addrs[0].getBalance()

    const listing = await create1155listing()

    const value = await distributedMarketplaceInstance.getListingPriceWithRoyalties(listing.nft, listing.tokenId, itemsToBuy, listing.nonce);

    // seller cannot buy
    await expect(distributedMarketplaceInstance.connect(addr1).purchaseItem(listing.nft, listing.tokenId, itemsToBuy, listing.nonce, { value }))
      .to.be.revertedWith("SellerCannotBuy")

    await expect(distributedMarketplaceInstance.connect(addr3).purchaseItem(listing.nft, listing.tokenId, itemsToBuy, listing.nonce))
      .to.be.revertedWith("PriceNotMet")

    const value2 = await distributedMarketplaceInstance.getListingPriceWithRoyalties(listing.nft, listing.tokenId, listing.value * itemsToBuy, listing.nonce);

    await expect(distributedMarketplaceInstance.connect(addr3).purchaseItem(listing.nft, listing.tokenId, listing.value * itemsToBuy, listing.nonce, { value: value2 }))
      .to.be.revertedWith("Sold")

    const addr4BalanceBefore = await addr4.getBalance()
    const addr1BalanceBefore = await addr1.getBalance()

    const sellerBalanceBefore = await erc1155Instance1.balanceOf(addr1.address, listing.tokenId)
    // purchase 2 of tokenId
    await expect(distributedMarketplaceInstance.connect(addr3).purchaseItem(listing.nft, listing.tokenId, itemsToBuy, listing.nonce, { value }))
      .not.to.be.reverted

    // check listing is sold and new owner set
    var foundListing = await distributedMarketplaceInstance.getListing(listing.nft, listing.tokenId)

    // not all items are purchased, to sold stays previous
    expect(false, "item should not be sold").to.eq(foundListing.sold)

    // buyer should receive 2 items
    let buyerBalance = await erc1155Instance1.balanceOf(addr3.address, listing.tokenId)
    expect(2, "buyer balance should be increased").to.eq(buyerBalance)

    // seller should still have last tokens
    let sellerBalanceAfter = await erc1155Instance1.balanceOf(addr1.address, listing.tokenId)
    expect(sellerBalanceBefore - itemsToBuy, "seller balance should be decreased").to.eq(sellerBalanceAfter)

    // check value in listing decreased for 1
    expect(listing.value - itemsToBuy, "value in listing record should be decreased").to.eq(foundListing.value)

    // buyer is now last owner 
    expect(addr3.address, "buyer is now last owner").to.eq(foundListing.owner)

    // check addr4 received 10% royalty
    const addr4BalanceAfter = await addr4.getBalance()
    expect(weiToNumber(addr4BalanceBefore) + (10 / 100) * weiToNumber(listing.price) * itemsToBuy, "addr4 receives 10% royalty").to.eq(weiToNumber(addr4BalanceAfter))

    // check addr1 received payment
    const addr1BalanceAfter = await addr1.getBalance()
    expect(weiToNumber(addr1BalanceBefore) + weiToNumber(listing.price) * itemsToBuy, "addr1 receives payment for purchase").to.eq(weiToNumber(addr1BalanceAfter))

    //addrs[0] should receive listing royalty (2) + sell royalty (10%) 
    const addrs0BalanceAfter = await addrs[0].getBalance()
    expect(weiToNumber(addrs0BalanceBefore) + listingOfferFee * itemsToList + (10 / 100) * weiToNumber(listing.price) * itemsToBuy).to.eq(weiToNumber(addrs0BalanceAfter))
  })

  /**
   * Creates offer for 721 nft contract
   * (offerer is addr3)
   * 
   * @param {{
   * listing: {
   * nft: string,
   * tokenId: number,
   * price: BigNumber,
   * value: number,
   * nonce: [
   * number,
   * import("ethers").Bytes ],
   * _value: number,
   * _nonce: [
   * number,
   * import("ethers").Bytes
   * ]},
   * _amount: number
   * },
   * }} { listing, _value = 0, _nonce = null, _amount = 1 }
   * @return {{
   * nft: string,
   * tokenId: number,
   * price: BigNumber,
   * value: number,
   * offerer: string,
   * nonce: [
   * number,
   * import("ethers").Bytes
   * }} 
   */
  const createOffer = async ({ listing, _nonce = null, _amount = 1, _addr = addr3 }) => {
    const offer = {
      nft: listing.nft,
      tokenId: listing.tokenId,
      price: toWei(1),
      value: _amount,
      offerer: _addr.address,
      nonce: _nonce ?? listing.nonce
    }

    const value = await distributedMarketplaceInstance.getOfferPriceWithRoyalties(
      offer.nft,
      offer.tokenId,
      [
        1,
        offer.price,
        offer.value,
        offer.nonce
      ]
    )

    await distributedMarketplaceInstance.connect(_addr).createOffer(
      offer.nft,
      offer.tokenId,
      offer.price,
      offer.value,
      offer.nonce,
      { value }
    )

    return offer
  }

  it('should create offer for 721', async () => {
    await distributedMarketplaceInstance.setRoyalties(addrs[0].address, 1000, toWei(2), toWei(2))

    const listing = await create721listing()

    const mBalanceBefore = await ethers.provider.getBalance(distributedMarketplaceInstance.address)

    const addrs0BalanceBefore = await addrs[0].getBalance()

    const offer = await createOffer({ listing })

    const mBalanceAfter = await ethers.provider.getBalance(distributedMarketplaceInstance.address)
    const addrs0BalanceAfter = await addrs[0].getBalance()

    // marketplace should receive whole offer price
    expect(weiToNumber(mBalanceBefore) + offer.value * weiToNumber(offer.price))
      .to.eq(weiToNumber(mBalanceAfter))

    // addrs[0] should receive make offer fee
    expect(weiToNumber(addrs0BalanceBefore) + 2).to.eq(weiToNumber(addrs0BalanceAfter))
  })

  it('should accept offer', async () => {
    await distributedMarketplaceInstance.setRoyalties(addrs[0].address, 2000, toWei(2), toWei(2))

    const listing = await create721listing()

    let mBalanceBefore = await ethers.provider.getBalance(distributedMarketplaceInstance.address)

    let addrs0BalanceBefore = await addrs[0].getBalance()

    const offer = await createOffer({ listing })

    let mBalanceAfter = await ethers.provider.getBalance(distributedMarketplaceInstance.address)
    let addrs0BalanceAfter = await addrs[0].getBalance()

    expect(weiToNumber(mBalanceBefore) + offer.value * weiToNumber(offer.price), "marketplace should receive whole offer price")
      .to.eq(weiToNumber(mBalanceAfter))

    expect(weiToNumber(addrs0BalanceBefore) + 2, "addrs[0] should receive make offer fee").to.eq(weiToNumber(addrs0BalanceAfter))

    addrs0BalanceBefore = addrs0BalanceAfter
    let add1BalanceBefore = await addr1.getBalance()
    const addr4BalanceBefore = await addr4.getBalance()

    await expect(distributedMarketplaceInstance.connect(addr1).acceptOffer(offer.nft, offer.tokenId, offer.offerer, offer.nonce), "should accept offer")
      .not.to.be.reverted

    // marketplace should be 0 price after accept offer
    mBalanceAfter = await ethers.provider.getBalance(distributedMarketplaceInstance.address)

    expect(mBalanceAfter).to.eq(0)

    addrs0BalanceAfter = await addrs[0].getBalance()

    expect(weiToNumber(addrs0BalanceBefore) + weiToNumber(offer.price) * 20 / 100, "marketplace royalty address should receive percentage fee to it balance").to.eq(weiToNumber(addrs0BalanceAfter));

    // addr1 should receive value = offer.price - all fees
    let addr1BalanceAfter = await addr1.getBalance()

    const offerPriceForBuyer = await distributedMarketplaceInstance.getOfferPriceWithRoyalties(
      offer.nft,
      offer.tokenId,
      [
        0,
        offer.price,
        offer.value,
        offer.nonce
      ]
    )

    expect(toFixed(weiToNumber(offer.price) - weiToNumber(offer.price) * 20 / 100 - weiToNumber(offer.price) * 10 / 100), "offerPriceBuyer = offer.price - 20% fee of marketplace - fee of erc2981 of nft").to.eq(
      weiToNumber(offerPriceForBuyer)
    )

    expect(toFixed(weiToNumber(add1BalanceBefore) + weiToNumber(offerPriceForBuyer), 2), "seller receives offer price minus fees").to.eq(weiToNumber(addr1BalanceAfter, 2))

    const addr4BalanceAfter = await addr4.getBalance()

    expect(toFixed(weiToNumber(addr4BalanceBefore) + weiToNumber(offer.price) * 10 / 100), "royalty holder of nft (addr4) of nft should receive it's royalties (10%)")
      .to.eq(weiToNumber(addr4BalanceAfter))

    const newOwner = await erc721Instance1.ownerOf(offer.tokenId)

    expect(offer.offerer, "offer.offerer should receive token to his balance").to.eq(newOwner)

    const foundOffer = await distributedMarketplaceInstance.getOffer(offer.nft, offer.tokenId, offer.offerer)
    expect(true, "offer marked as accepted").eq(foundOffer.accepted)
  })

  it('should delete offer', async () => {
    await distributedMarketplaceInstance.setRoyalties(addrs[0].address, 2000, toWei(2), toWei(2))

    const listing = await create721listing()

    // addr3 - offerer
    const addr3BalanceInitial = await addr3.getBalance()

    const offer = await createOffer({ listing })

    let mBalanceBefore = await ethers.provider.getBalance(distributedMarketplaceInstance.address)

    const addr3BalanceBefore = await addr3.getBalance()

    await expect(distributedMarketplaceInstance.connect(addr3).deleteOffer(
      offer.nft,
      offer.tokenId
    )).not.to.be.reverted

    let mBalanceAfter = await ethers.provider.getBalance(distributedMarketplaceInstance.address)

    const addr3BalanceAfter = await addr3.getBalance()

    expect(mBalanceBefore.sub(offer.price), "marketplace balance decreased for offer price")
      .to.eq(mBalanceAfter)


    expect(weiToNumber(addr3BalanceBefore.add(offer.price), "offerer received offer.price back", 2))
      .to.eq(weiToNumber(addr3BalanceAfter, 2))

    const [, marketplaceFee] = await distributedMarketplaceInstance.royaltyInfo([
      1,
      offer.price,
      offer.value,
      offer.nonce
    ])

    expect(weiToNumber(addr3BalanceInitial, 2) - weiToNumber(marketplaceFee, 2), "offerer balance decreased to marketplace offer fee at all")
      .to.eq(weiToNumber(addr3BalanceAfter, 2))
  })

  it('should handle signed nonce for offers', async () => {
    await distributedMarketplaceInstance.setRoyalties(addrs[0].address, 2000, toWei(2), toWei(2))
    await distributedMarketplaceInstance.setGlobalAttestant(addr4.address)

    // sign fee value = 0
    const nonce = await createNonce(0, 4)

    const listing = await create721listing()

    const offer = {
      nft: listing.nft,
      tokenId: listing.tokenId,
      value: 1,
      price: toWei(1),
      nonce: emptyNonce
    }
    // when nonce not passed: price = make offer regular fee + offer.value
    let offerPriceWithFee = await distributedMarketplaceInstance.getOfferPriceWithRoyalties(
      listing.nft,
      listing.tokenId,
      [
        1,
        offer.price,
        offer.value,
        offer.nonce
      ]
    )

    expect(2 + weiToNumber(offer.price) * offer.value)
      .to.eq(weiToNumber(offerPriceWithFee))

    offer.nonce = nonce.request

    // when nonce passed: price = offer.value only
    offerPriceWithFee = await distributedMarketplaceInstance.getOfferPriceWithRoyalties(
      listing.nft,
      listing.tokenId,
      [
        1,
        offer.price,
        offer.value,
        offer.nonce
      ]
    )

    expect(weiToNumber(offer.price) * offer.value)
      .to.eq(weiToNumber(offerPriceWithFee))
  })

  it('should process offer with signed nonce', async () => {
    await distributedMarketplaceInstance.setRoyalties(addrs[0].address, 2000, toWei(2), toWei(2))
    await distributedMarketplaceInstance.setGlobalAttestant(addr4.address)

    // set price to 10%, when default marketplace is 20
    const marketplaceCommission = 10
    const nonce = await createNonce(marketplaceCommission, 4)

    const listing = await create721listing()

    const offer = {
      offerer: addr4.address,
      nft: listing.nft,
      tokenId: listing.tokenId,
      value: 1,
      price: toWei(1),
      nonce: nonce.request
    }

    const offerPrice = offer.value * weiToNumber(offer.price)

    const createOfferPrice = await distributedMarketplaceInstance.getOfferPriceWithRoyalties(
      offer.nft,
      offer.tokenId,
      [
        1,
        offer.price,
        offer.value,
        offer.nonce
      ]
    )

    expect(offerPrice + weiToNumber(nonce.value) * offer.value, 'should pay full item price + nonce.value * value').to.eq(weiToNumber(createOfferPrice))

    const buyOfferPrice = await distributedMarketplaceInstance.getOfferPriceWithRoyalties(
      offer.nft,
      offer.tokenId,
      [
        0,
        offer.price,
        offer.value,
        offer.nonce
      ]
    )

    const nftRoyaltyFee = offerPrice * 10 / 100
    const marketplaceRoyaltyFee = offerPrice * marketplaceCommission / 100

    expect(offerPrice - nftRoyaltyFee - marketplaceRoyaltyFee).to.eq(weiToNumber(buyOfferPrice))

    await expect(distributedMarketplaceInstance.connect(addr4).createOffer(
      offer.nft,
      offer.tokenId,
      offer.price,
      offer.value,
      offer.nonce,
      { value: createOfferPrice }
    ), 'should be full item price - 10% royalties of nft - nonce.value % royalties of marketplace').not.to.be.reverted

    const addr1BalanceBefore = await addr1.getBalance()

    await expect(distributedMarketplaceInstance.connect(addr1).acceptOffer(
      offer.nft,
      offer.tokenId,
      offer.offerer,
      offer.nonce
    ), 'offer should be accepted').not.to.be.reverted

    const addr1BalanceAfter = await addr1.getBalance()
    expect(weiToNumber(addr1BalanceBefore.add(buyOfferPrice), 2), 'seller should receive price after acceptOffer').eq(weiToNumber(addr1BalanceAfter, 2))
  })

  it('should update offer', async () => {
    const listing = await create721listing()

    const offer = await createOffer({ listing })

    // per 1 item
    let newPrice = toWei(2)

    let priceDelta = newPrice.sub(offer.price)

    await expect(distributedMarketplaceInstance.updateOffer(
      offer.nft,
      offer.tokenId,
      newPrice,
      offer.value
    )).to.be.revertedWith("NotOwner")

    await expect(distributedMarketplaceInstance.connect(addr3).updateOffer(
      offer.nft,
      offer.tokenId,
      newPrice,
      offer.value
    )).to.be.revertedWith("PriceNotMet")

    await expect(distributedMarketplaceInstance.connect(addr3).updateOffer(
      offer.nft,
      offer.tokenId,
      newPrice,
      offer.value,
      {
        value: priceDelta
      }
    )).not.to.be.reverted

    let foundOffer = await distributedMarketplaceInstance.getOffer(
      offer.nft,
      offer.tokenId,
      offer.offerer
    )

    expect(toWei(newPrice)).to.eq(toWei(foundOffer.price))

    offer.price = newPrice

    newPrice = toWei(3)
    newValue = 10

    priceDelta = newPrice.mul(newValue)
    priceDelta = priceDelta.sub(offer.price.mul(offer.value))

    const marketplaceBalanceBefore = await ethers.provider.getBalance(distributedMarketplaceInstance.address)

    await expect(distributedMarketplaceInstance.connect(addr3).updateOffer(
      offer.nft,
      offer.tokenId,
      newPrice,
      newValue,
      {
        value: priceDelta
      }
    )).not.to.be.reverted

    const marketplaceBalanceAfter = await ethers.provider.getBalance(distributedMarketplaceInstance.address)

    expect(marketplaceBalanceBefore.add(priceDelta)).eq(marketplaceBalanceAfter)

    foundOffer = await distributedMarketplaceInstance.getOffer(
      offer.nft,
      offer.tokenId,
      offer.offerer
    )

    expect(toWei(newPrice)).to.eq(toWei(foundOffer.price))
    expect(toWei(newValue)).to.eq(toWei(foundOffer.value))
  })

  it('should handle pause flag', async () => {
    await distributedMarketplaceInstance.setPaused(true)

    const listing = {
      nft: erc721Instance1.address,
      tokenId: 1,
      price: toWei(1),
      value: 1,
      nonce: emptyNonce
    }

    await erc721Instance1.approve(transmitter721_1155Instance.address, listing.tokenId)

    await expect(distributedMarketplaceInstance.connect(addr1).createListing(
      listing.nft,
      listing.tokenId,
      listing.price,
      listing.value,
      listing.nonce
    ), 'should revert because contract is paused').to.be.revertedWith("Paused")

    await distributedMarketplaceInstance.setPaused(false)

    const [, listingFee] = await distributedMarketplaceInstance.royaltyInfo(
      [2, listing.price, listing.value, listing.nonce]
    )

    await expect(distributedMarketplaceInstance.connect(addr1).createListing(
      listing.nft,
      listing.tokenId,
      listing.price,
      listing.value,
      listing.nonce,
      { value: listingFee }
    ), 'should not revert when contract is not paused').not.to.be.reverted
  })

  it('should handle partial listing value', async () => {
    // create 10 items
    const listing = await create1155listing({ _amount: 10 })

    let offer = await createOffer({ listing, _amount: 4 })

    await expect(distributedMarketplaceInstance.connect(addr1).acceptOffer(
      offer.nft,
      offer.tokenId,
      offer.offerer,
      offer.nonce
    )).not.to.be.reverted

    // listing should update it's value and not to be sold yet
    let foundListing = await distributedMarketplaceInstance.getListing(
      listing.nft,
      listing.tokenId
    )

    expect(listing.value - offer.value).eq(foundListing.value)
    expect(addr3.address).eq(foundListing.owner)

    // await distributedMarketplaceInstance.connect(addr3).deleteOffer(
    //   offer.nft,
    //   offer.tokenId
    // )

    // lets buy last items and check if listing is sold now
    // offer = await createOffer({ listing, _amount: 6 })
    offer.value = 6
    offer.offerer = addr4.address

    const offerPrice = await distributedMarketplaceInstance.getOfferPriceWithRoyalties(
      offer.nft,
      offer.tokenId,
      [
        1,
        offer.price,
        offer.value,
        offer.nonce
      ]
    )

    await expect(distributedMarketplaceInstance.connect(addr4).createOffer(
      offer.nft,
      offer.tokenId,
      offer.price,
      offer.value,
      offer.nonce,
      { value: offerPrice }), "should create offer as new addr4").not.to.be.reverted

    await expect(distributedMarketplaceInstance.connect(addr1).acceptOffer(
      offer.nft,
      offer.tokenId,
      offer.offerer,
      offer.nonce
    ), "should accept newly created offer from addr 4").not.to.be.reverted

    foundListing = await distributedMarketplaceInstance.getListing(
      listing.nft,
      listing.tokenId
    )

    expect(0).to.eq(foundListing.value)
    expect(true).to.eq(foundListing.sold)
    expect(addr4.address).to.eq(foundListing.owner)
  })

  it('should transfer money to new address offer', async () => {
    // create offer for old marketplace
    const listing = await create721listing()
    const offer = await createOffer({ listing })

    // abandon old marketplace like inactive transfer money to new marketplace, transfer money to new one
    await distributedMarketplaceInstance.setPaused(true)

    const marketplaceBalanceBefore = await ethers.provider.getBalance(distributedMarketplaceInstance.address)
    const marketplace2BalanceBefore = await ethers.provider.getBalance(distributedMarketplaceInstance2.address)

    await expect(distributedMarketplaceInstance.withdrawAll(distributedMarketplaceInstance2.address))
      .not.to.be.reverted

    const marketplaceBalanceAfter = await ethers.provider.getBalance(distributedMarketplaceInstance.address)
    const marketplace2BalanceAfter = await ethers.provider.getBalance(distributedMarketplaceInstance2.address)

    expect(weiToNumber(marketplaceBalanceAfter)).eq(0)
    expect(weiToNumber(marketplace2BalanceAfter)).eq(weiToNumber(marketplace2BalanceBefore) + weiToNumber(marketplaceBalanceBefore))

    // should cancel offer with refund
    const addr3BalanceBefore = await addr3.getBalance()

    await expect(distributedMarketplaceInstance2.connect(addr3).deleteOffer(
      offer.nft,
      offer.tokenId
    )).not.to.be.reverted

    const addr3BalanceAfter = await addr3.getBalance()

    await expect(weiToNumber(addr3BalanceBefore) + weiToNumber(offer.price))
      .eq(weiToNumber(addr3BalanceAfter))
  })

  it('[bugfix] should getOfferPriceWithRoyalties for price 1', async () => {
    // const nonce = await createNonce()
    const meta = [
      1,
      toWei(1),
      1,
      emptyNonce
    ]

    const price = await distributedMarketplaceInstance.getOfferPriceWithRoyalties(
      erc1155Instance1.address,
      2,
      meta
    )

    expect(price).not.undefined
  })

  it('[bugfix] seller make offers', async () => {
    const listing = await create721listing()

    const offer = {
      nft: listing.nft,
      tokenId: listing.tokenId,
      price: toWei(1),
      value: 1,
      offerer: addr1.address,
      nonce: listing.nonce
    }

    const value = await distributedMarketplaceInstance.getOfferPriceWithRoyalties(
      offer.nft,
      offer.tokenId,
      [
        1,
        offer.price,
        offer.value,
        offer.nonce
      ]
    )

    await expect(distributedMarketplaceInstance.connect(addr1).createOffer(
      offer.nft,
      offer.tokenId,
      offer.price,
      offer.value,
      offer.nonce,
      { value }
    )).to.be.revertedWith("SellerCannotBuy")
  })

  it('[bugfix] offerers should be able to refund money back', async () => {

    const listing = await create721listing()

    const offer1 = await createOffer({ listing, _addr: addr3 })
    const offer2 = await createOffer({ listing, _addr: addr4 })

    let purchaseValue = await distributedMarketplaceInstance.getListingPriceWithRoyalties(
      listing.nft,
      listing.tokenId,
      listing.value,
      emptyNonce
    )

    await distributedMarketplaceInstance.connect(addr2)
      .purchaseItem(
        listing.nft,
        listing.tokenId,
        listing.value,
        listing.nonce,
        { value: purchaseValue }
      )

    await expect(distributedMarketplaceInstance.connect(addr4)
      .deleteOffer(
        offer2.nft,
        offer2.tokenId
      )).not.to.be.reverted

    await expect(distributedMarketplaceInstance.connect(addr3)
      .deleteOffer(
        offer1.nft,
        offer1.tokenId
      )).not.to.be.reverted
  })
})