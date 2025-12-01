
const { expect } = require("chai");
const { ethers } = require("hardhat");

const toWei = (num) => ethers.utils.parseEther(num.toString())
const fromWei = (num) => ethers.utils.formatEther(num)
const weiToNumber = (num, fixNum = 3) => parseFloat((+fromWei(num)).toFixed(fixNum))

describe('Transmitter', () => {
  let nftInstance;

  let transmitter7211155Instance;
  let transmitterControllerInstance;

  let deployer
  let addr1
  let addr2
  let addr3
  let addrs

  beforeEach(async () => {
    let transmitterControllerFactory = await ethers.getContractFactory('TransmitterController');
    transmitterControllerInstance = await transmitterControllerFactory.deploy();
    [deployer, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

    let transmitterFactory = await ethers.getContractFactory('Transmitter721_1155');
    transmitter7211155Instance = await transmitterFactory.deploy();
    [deployer, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

    let nftFactory = await ethers.getContractFactory('AynnNFTPayable005')
    nftInstance = await nftFactory.deploy("TEST_COLLECTION", "T_COL", addr1.address, 500)
  })

  it('should return isSendAllowed = true when allowed', async () => {
    await nftInstance.mint(1, "ipfs://token-id-1-url")
    await nftInstance.mint(2, "ipfs://token-id-2-url")

    await nftInstance.approve(transmitter7211155Instance.address, 1)

    let isApproved = await transmitter7211155Instance.isTokenApprovedOwn(nftInstance.address, deployer.address, 1)

    expect(true).to.equal(isApproved)
  })

  it('should send when everything is ok', async () => {
    await nftInstance.mint(1, "ipfs://token-id-1-url")
    await nftInstance.mint(2, "ipfs://token-id-2-url")

    await nftInstance.approve(transmitter7211155Instance.address, 1)

    await transmitter7211155Instance.setRemoteAllowance(deployer.address, true)

    await expect(transmitter7211155Instance.safeTransferFrom(nftInstance.address, 1, 1, deployer.address, addr1.address))
      .not.to.be.reverted

    const newOwner = await nftInstance.ownerOf(1)

    expect(addr1.address).equal(newOwner)
  })

  it('should fail send when not remote allowed', async () => {
    await nftInstance.mint(1, "ipfs://token-id-1-url")
    await nftInstance.mint(2, "ipfs://token-id-2-url")

    await nftInstance.approve(transmitter7211155Instance.address, 1)

    await expect(transmitterControllerInstance.safeTransferFrom(nftInstance.address, 1, 1, deployer.address, addr1.address))
      .to.be.revertedWith("RemoteNotAllowed")
  })

  it('should fail send when not approved', async () => {
    await nftInstance.mint(1, "ipfs://token-id-1-url")
    await nftInstance.mint(2, "ipfs://token-id-2-url")

    await transmitter7211155Instance.setRemoteAllowance(deployer.address, true)

    await expect(transmitter7211155Instance.safeTransferFrom(nftInstance.address, 1, 1, deployer.address, addr1.address))
      .to.be.reverted
  })
})