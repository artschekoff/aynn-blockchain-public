const { expect } = require("chai");
const { ethers } = require("hardhat");

const toWei = (num) => ethers.utils.parseEther(num.toString())
const fromWei = (num) => ethers.utils.formatEther(num)
const weiToNumber = (num, fixNum = 3) => parseFloat((+fromWei(num)).toFixed(fixNum))

describe('OfferStore', () => {
  let offerStoreInstance;
  let nftInstance1;
  let nftInstance2;

  let deployer
  let addr1
  let addr2
  let addr3
  let addrs

  beforeEach(async () => {
    let offerStoreFactory = await ethers.getContractFactory('OfferStore');
    offerStoreInstance = await offerStoreFactory.deploy();
    [deployer, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

    let nftFactory = await ethers.getContractFactory('AynnNFTPayable005')

    nftInstance1 = await nftFactory.deploy("TEST_COLLECTION", "T_COL", addr1.address, 500)
    nftInstance2 = await nftFactory.deploy("TEST_COLLECTION", "T_COL", addr1.address, 500)
  })

  it('should return true for added address', async () => {
    await offerStoreInstance.setRemoteAllowance(addr2.address, true)
    expect(await offerStoreInstance.isAllowed(addr2.address)).to.eq(true);
  })

  it('should fail on attempt to add address for not owner', async () => {
    await expect(offerStoreInstance.connect(addr2).setRemoteAllowance(addr3.address))
      .to.be.reverted
  })

  it('should create offer from allowed remote', async () => {
    var offer = {
      nft: nftInstance1.address,
      tokenId: 1,
      offerer: addr1.address,
      price: toWei(1)
    }

    await offerStoreInstance.setRemoteAllowance(deployer.address, true)

    await offerStoreInstance.createOffer(
      offer.nft,
      offer.tokenId,
      offer.offerer,
      offer.price,
      1
    )

    const offerInstance = await offerStoreInstance.getOffer(nftInstance1.address, offer.tokenId, offer.offerer)

    expect(offer.nft).to.equal(offerInstance.nft)
    expect(offer.tokenId).to.equal(offerInstance.tokenId)
    expect(offer.offerer).to.equal(offerInstance.offerer)
    expect(offer.price).to.equal(offerInstance.price)
  })

  it('should fail on add offer from unknown remote', async () => {
    var offer = {
      nft: nftInstance1.address,
      tokenId: 1,
      offerer: addr1.address,
      price: toWei(1)
    }

    await expect(offerStoreInstance.createOffer(
      offer.nft,
      offer.tokenId,
      offer.offerer,
      offer.price,
      1
    )).to.be.revertedWith('RemoteNotAllowed')
  })

  it('should delete offer', async () => {
    var offer = {
      nft: nftInstance1.address,
      tokenId: 1,
      offerer: addr1.address,
      price: toWei(1)
    }

    await offerStoreInstance.setRemoteAllowance(deployer.address, true)

    await offerStoreInstance.createOffer(
      offer.nft,
      offer.tokenId,
      offer.offerer,
      offer.price,
      1
    )

    var offerInstance = await offerStoreInstance.getOffer(nftInstance1.address, offer.tokenId, offer.offerer)

    expect(offer.nft).to.equal(offerInstance.nft)

    await offerStoreInstance.deleteOffer(
      nftInstance1.address,
      offer.tokenId,
      offer.offerer
    )

    await expect(offerStoreInstance.getOffer(nftInstance1.address, 1)).to.be.reverted
  })

  it('should update offer', async () => {
    var offer = {
      nft: nftInstance1.address,
      tokenId: 1,
      offerer: addr1.address,
      price: toWei(1),
      value: 1,
      accepted: false
    }

    await offerStoreInstance.setRemoteAllowance(deployer.address, true)

    await offerStoreInstance.createOffer(
      offer.nft,
      offer.tokenId,
      offer.offerer,
      offer.price,
      1
    )

    var offerInstance = await offerStoreInstance.getOffer(nftInstance1.address, offer.tokenId, offer.offerer)

    expect(offer.nft).to.equal(offerInstance.nft)
    expect(offer.price).to.equal(offerInstance.price)

    offer.price = toWei(2)

    await offerStoreInstance.updateOffer(
      nftInstance1.address,
      offer.tokenId,
      offer.offerer,
      offer
    )

    offerInstance = await offerStoreInstance.getOffer(nftInstance1.address, offer.tokenId, offer.offerer)
    expect(offer.price).to.equal(offerInstance.price)
  })

  it('should get offer and offer coounter by index', async () => {
    await offerStoreInstance.setRemoteAllowance(deployer.address, true)

    var offerNft1 = {
      nft: nftInstance1.address,
      tokenId: 2,
      offerer: addr1.address,
      price: toWei(1)
    }

    await offerStoreInstance.createOffer(
      offerNft1.nft,
      offerNft1.tokenId,
      offerNft1.offerer,
      offerNft1.price,
      1
    )

    offerNft1 = {
      ...offerNft1,
      tokenId: 1,
      price: toWei(1)
    }

    await offerStoreInstance.createOffer(
      offerNft1.nft,
      offerNft1.tokenId,
      offerNft1.offerer,
      offerNft1.price,
      1
    )

    offerNft1 = {
      ...offerNft1,
      tokenId: 1,
      price: toWei(3)
    }

    await offerStoreInstance.createOffer(
      offerNft1.nft,
      offerNft1.tokenId,
      offerNft1.offerer,
      offerNft1.price,
      1
    )

    var offerNft2 = {
      ...offerNft1,
      nft: nftInstance2.address
    }

    await offerStoreInstance.createOffer(
      offerNft2.nft,
      offerNft2.tokenId,
      offerNft2.offerer,
      offerNft2.price,
      1
    )

    // test nft1
    var offerInstance = await offerStoreInstance.getOfferByIndex(offerNft1.nft, 2, 0)
    expect(2).to.be.equal(offerInstance.tokenId)

    offerInstance = await offerStoreInstance.getOfferByIndex(offerNft1.nft, 1, 0)
    expect(1).to.be.equal(offerInstance.tokenId)

    var listingCounter = await offerStoreInstance.getOfferCounter(offerNft1.nft, 1)
    expect(2).equal(listingCounter)

    await offerStoreInstance.deleteOffer(offerNft1.nft, 1, offerNft1.offerer)

    listingCounter = await offerStoreInstance.getOfferCounter(offerNft1.nft, 1)
    expect(1).equal(listingCounter)

    // test nft2

    var offerInstance = await offerStoreInstance.getOfferByIndex(offerNft2.nft, 1, 0)
    expect(1).to.be.equal(offerInstance.tokenId)

    var listingCounter = await offerStoreInstance.getOfferCounter(offerNft2.nft, 1)
    expect(1).equal(listingCounter)

    await offerStoreInstance.deleteOffer(offerNft2.nft, 1, offerNft1.offerer)

    listingCounter = await offerStoreInstance.getOfferCounter(offerNft2.nft, 1)
    expect(0).equal(listingCounter)
  })
})