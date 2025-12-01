const { expect } = require("chai");
const { ethers } = require("hardhat");

describe('RemoteAllowance', () => {
  let remoteAllowanceInstance;

  let deployer
  let addr1
  let addr2
  let addr3
  let addrs

  beforeEach(async () => {
    let remoteAllowanceFactory = await ethers.getContractFactory('RemoteAllowance');
    remoteAllowanceInstance = await remoteAllowanceFactory.deploy();
    [deployer, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();
  })

  it('should return true for added address', async () => {
    await remoteAllowanceInstance.setRemoteAllowance(addr2.address, true)
    expect(await remoteAllowanceInstance.connect(addr2).isAllowed(addr2.address)).to.eq(true);
  })

  it('should return false for not added address', async () => {
    expect(await remoteAllowanceInstance.connect(addr2).isAllowed(addr2.address)).to.eq(false);
  })

  it('should return false for false address', async () => {
    await remoteAllowanceInstance.setRemoteAllowance(addr2.address, false)
    expect(await remoteAllowanceInstance.connect(addr2).isAllowed(addr2.address)).to.eq(false);
  })

  it('should fail on attempt to add address for not owner', async () => {
    await expect(remoteAllowanceInstance.connect(addr2).setRemoteAllowance(addr3.address))
      .to.be.reverted
  })
})