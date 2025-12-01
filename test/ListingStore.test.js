const { expect } = require("chai");
const { ethers } = require("hardhat");

const toWei = (num) => ethers.utils.parseEther(num.toString())
const fromWei = (num) => ethers.utils.formatEther(num)
const weiToNumber = (num, fixNum = 3) => parseFloat((+fromWei(num)).toFixed(fixNum))

describe('ListingStore', () => {
  let listingStoreInstance;
  let nftInstance;

  let deployer
  let addr1
  let addr2
  let addr3
  let addrs

  beforeEach(async () => {
    let listingStoreFactory = await ethers.getContractFactory('ListingStore');
    listingStoreInstance = await listingStoreFactory.deploy();
    [deployer, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

    let nftFactory = await ethers.getContractFactory('AynnNFTPayable005')
    nftInstance = await nftFactory.deploy("TEST_COLLECTION", "T_COL", addr1.address, 500)

  })

  it('should return true for added address', async () => {
    await listingStoreInstance.setRemoteAllowance(addr2.address, true)
    expect(await listingStoreInstance.isAllowed(addr2.address)).to.eq(true);
  })

  it('should fail on attempt to add address for not owner', async () => {
    await expect(listingStoreInstance.connect(addr2).setRemoteAllowance(addr3.address))
      .to.be.reverted
  })

  it('should create listing from allowed remote', async () => {
    var listing = {
      seller: addr1.address,
      nft: nftInstance.address,
      tokenId: 1,
      price: toWei(1),
      value: 1
    }

    await listingStoreInstance.setRemoteAllowance(deployer.address, true)

    await listingStoreInstance.createListing(
      listing.nft,
      listing.tokenId,
      listing.seller,
      listing.price,
      listing.value
    )

    const listingInstance = await listingStoreInstance.getListing(nftInstance.address, listing.tokenId)

    expect(listing.nft).to.equal(listingInstance.nft)
    expect(listing.tokenId).to.equal(listingInstance.tokenId)
    expect(listing.seller).to.equal(listingInstance.seller)
    expect(listingStoreInstance.address).to.equal(listingInstance.owner)
    expect(listing.price).to.equal(listingInstance.price)
  })

  it('should fail on create listing from unknown remote', async () => {
    var listing = {
      seller: addr1.address,
      nft: nftInstance.address,
      tokenId: 1,
      price: toWei(1),
      value: 1
    }

    await expect(listingStoreInstance.createListing(
      listing.nft,
      listing.tokenId,
      listing.seller,
      listing.price,
      listing.value
    )).to.be.revertedWith('RemoteNotAllowed')
  })

  it('should delete listing', async () => {
    var listing = {
      seller: addr1.address,
      nft: nftInstance.address,
      tokenId: 1,
      price: toWei(1),
      value: 1
    }

    await listingStoreInstance.setRemoteAllowance(deployer.address, true)

    await listingStoreInstance.createListing(
      listing.nft,
      listing.tokenId,
      listing.seller,
      listing.price,
      listing.value
    )

    var listingInstance = await listingStoreInstance.getListing(nftInstance.address, listing.tokenId)

    expect(listing.nft).to.equal(listingInstance.nft)

    await listingStoreInstance.deleteListing(
      nftInstance.address,
      listing.tokenId
    )

    const foundListing = await listingStoreInstance.getListing(nftInstance.address, listing.tokenId)

    expect(0, 'should return empty listing').eq(weiToNumber(foundListing.price))
    expect(false, 'should return empty listing').eq(foundListing.sold)
  })

  it('should update listing', async () => {
    var listing = {
      seller: addr1.address,
      nft: nftInstance.address,
      owner: addr1.address,
      tokenId: 1,
      price: toWei(1),
      value: 1,
      sold: false
    }

    await listingStoreInstance.setRemoteAllowance(deployer.address, true)

    await listingStoreInstance.createListing(
      listing.nft,
      listing.tokenId,
      listing.seller,
      listing.price,
      listing.value
    )

    var listingInstance = await listingStoreInstance.getListing(nftInstance.address, listing.tokenId)

    expect(listing.nft).to.equal(listingInstance.nft)
    expect(listing.price).to.equal(listingInstance.price)

    listing.price = toWei(2)

    await listingStoreInstance.updateListing(
      nftInstance.address,
      listing.tokenId,
      listing
    )

    listingInstance = await listingStoreInstance.getListing(nftInstance.address, listing.tokenId)

    expect(listing.price).to.equal(listingInstance.price)
  })

  it('should get listing and listing coounter by index', async () => {
    await listingStoreInstance.setRemoteAllowance(deployer.address, true)

    var listing = {
      seller: addr1.address,
      nft: nftInstance.address,
      tokenId: 2,
      price: toWei(1),
      value: 1
    }

    await listingStoreInstance.createListing(
      listing.nft,
      listing.tokenId,
      listing.seller,
      listing.price,
      listing.value
    )

    listing = {
      ...listing,
      tokenId: 1,
      price: toWei(1)
    }

    await listingStoreInstance.createListing(
      listing.nft,
      listing.tokenId,
      listing.seller,
      listing.price,
      listing.value
    )

    // first token should be 2, second - 1
    var listingInstance = await listingStoreInstance.getListingByIndex(listing.nft, 0)
    expect(2).to.be.equal(listingInstance.tokenId)

    listingInstance = await listingStoreInstance.getListingByIndex(listing.nft, 1)
    expect(1).to.be.equal(listingInstance.tokenId)

    var listingCounter = await listingStoreInstance.getListingCounter(listing.nft)
    expect(2).equal(listingCounter)

    await listingStoreInstance.deleteListing(listing.nft, 2)

    listingCounter = await listingStoreInstance.getListingCounter(listing.nft)
    expect(1).equal(listingCounter)
  })
})