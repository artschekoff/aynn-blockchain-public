const { expect } = require("chai")
const { BigNumber } = require("ethers")
const { ethers } = require("hardhat")
const { createNonce, toWei, toFixed, weiToNumber, fromWei, emptyNonce } = require("./testUtils")

describe('dm batch worker test', () => {
  let distributedMarketplaceInstance
  let erc721Instance
  let erc1155Instance
  let dmBatchWorkerInstance

  let transmitterControllerInstance;
  let transmitter721_1155Instance;
  let offerStoreInstance;
  let listingStoreInstance;

  beforeEach(async () => {
    [deployer, addr1, addr2, addr3, addr4, ...addrs] = await ethers.getSigners()

    let distributedMarketplaceFactory = await ethers.getContractFactory('DistributedMarketplace')

    distributedMarketplaceInstance = await distributedMarketplaceFactory.deploy(
      deployer.address, 500, toWei(2), toWei(2)
    )

    // dm batch worker
    let dmBatchWorkerFactory = await ethers.getContractFactory("DMBatchWorker")
    dmBatchWorkerInstance = await dmBatchWorkerFactory.deploy()

    let transmitterControllerFactory = await ethers.getContractFactory('TransmitterController')
    transmitterControllerInstance = await transmitterControllerFactory.deploy()

    await transmitterControllerInstance.setRemoteAllowance(distributedMarketplaceInstance.address, true)
    await transmitterControllerInstance.setRemoteAllowance(dmBatchWorkerInstance.address, true)

    let transmitter721_1155Factory = await ethers.getContractFactory('Transmitter721_1155')
    transmitter721_1155Instance = await transmitter721_1155Factory.deploy()

    await transmitter721_1155Instance.setRemoteAllowance(transmitterControllerInstance.address, true)
    await transmitter721_1155Instance.setRemoteAllowance(dmBatchWorkerInstance.address, true)

    await transmitterControllerInstance.setTransmitterAddress(0, transmitter721_1155Instance.address)

    let offerStoreFactory = await ethers.getContractFactory('OfferStore')
    offerStoreInstance = await offerStoreFactory.deploy()

    await offerStoreInstance.setRemoteAllowance(distributedMarketplaceInstance.address, true)
    await offerStoreInstance.setRemoteAllowance(dmBatchWorkerInstance.address, true)

    let listingStoreFactory = await ethers.getContractFactory('ListingStore')
    listingStoreInstance = await listingStoreFactory.deploy()

    await listingStoreInstance.setRemoteAllowance(distributedMarketplaceInstance.address, true)
    await listingStoreInstance.setRemoteAllowance(dmBatchWorkerInstance.address, true)

    // startup configuration
    await distributedMarketplaceInstance.setUnitAddress(0, listingStoreInstance.address)
    await distributedMarketplaceInstance.setUnitAddress(1, offerStoreInstance.address)
    await distributedMarketplaceInstance.setUnitAddress(2, transmitterControllerInstance.address)

    await dmBatchWorkerInstance.setUnitAddress(0, listingStoreInstance.address)
    await dmBatchWorkerInstance.setUnitAddress(1, offerStoreInstance.address)
    await dmBatchWorkerInstance.setUnitAddress(2, transmitterControllerInstance.address)
    await dmBatchWorkerInstance.setUnitAddress(3, distributedMarketplaceInstance.address)

    // nft
    let erc721Factory = await ethers.getContractFactory('Aynn721_002')

    // instance 1
    erc721Instance = await erc721Factory.connect(addr1).deploy("AYNN", "AYNN", addr1.address, 1000)
    await erc721Instance.mint(addr1.address, "https://token-1-uri.com")
    await erc721Instance.mint(addr1.address, "https://token-2-uri.com")
    await erc721Instance.mint(addr1.address, "https://token-10-uri.com")

    let erc1155Factory = await ethers.getContractFactory('Aynn1155Folder_001')

    // instance 1
    erc1155Instance = await erc1155Factory.connect(addr1).deploy("#hash1", addr1.address, 1000)
    await erc1155Instance.mint(addr1.address, 1, 10, [])
    await erc1155Instance.mint(addr1.address, 2, 20, [])
    await erc1155Instance.mint(addr1.address, 3, 30, [])
  })

  it('should create listing batch', async () => {
    const request = [[
      erc721Instance.address,
      1,
      toWei(2),
      1
    ], [
      erc1155Instance.address,
      1,
      toWei(4),
      10
    ]]

    await erc1155Instance.setApprovalForAll(transmitter721_1155Instance.address, true)
    await erc721Instance.approve(transmitter721_1155Instance.address, 1)

    await dmBatchWorkerInstance.connect(addr1).createListingBatch(
      request,
      emptyNonce
    )

    // should contain listed elements

    let listing = await distributedMarketplaceInstance.getListing(
      erc721Instance.address,
      1
    )

    expect(false, listing.sold)
    expect(toWei(2)).to.eq(listing.price)
    expect(1).to.eq(listing.value)

    listing = await distributedMarketplaceInstance.getListing(
      erc1155Instance.address,
      1
    )

    expect(false, listing.sold)
    expect(toWei(4)).to.eq(listing.price)
    expect(10).to.eq(listing.value)
  })


  it('should update listing batch', async () => {
    let request = [[
      erc721Instance.address,
      1,
      toWei(2),
      1
    ], [
      erc1155Instance.address,
      1,
      toWei(4),
      10
    ]]

    await erc1155Instance.setApprovalForAll(transmitter721_1155Instance.address, true)
    await erc721Instance.approve(transmitter721_1155Instance.address, 1)

    await dmBatchWorkerInstance.connect(addr1).createListingBatch(
      request,
      emptyNonce
    )

    // change second listed item
    request[1][2] = toWei(10)
    request[1][3] = 2

    await dmBatchWorkerInstance.connect(addr1).updateListingBatch(
      request
    )

    const listing = await distributedMarketplaceInstance.getListing(
      erc1155Instance.address,
      1
    )

    expect(toWei(10)).to.eq(listing.price)
    expect(2).to.eq(listing.value)
  })

  it('should purchase items batch', async () => {
    const request = [[
      erc721Instance.address,
      1,
      toWei(2),
      1
    ], [
      erc1155Instance.address,
      1,
      toWei(4),
      10
    ]]

    await erc1155Instance.setApprovalForAll(transmitter721_1155Instance.address, true)
    await erc721Instance.approve(transmitter721_1155Instance.address, 1)

    await dmBatchWorkerInstance.connect(addr1).createListingBatch(
      request,
      emptyNonce
    )

    const purchasePrice = await distributedMarketplaceInstance.getListingPriceWithRoyalties(
      erc1155Instance.address,
      1,
      1,
      emptyNonce
    )

    const purchaseRequest = [[
      erc721Instance.address,
      1,
      1,
      emptyNonce
    ]]

    await dmBatchWorkerInstance.connect(addr2).purchaseItemBatch(

    )

  })
})