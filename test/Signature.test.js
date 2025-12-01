const { ethers } = require("hardhat")
const { createNonce, toWei } = require('./testUtils')
const { parseBytes32String } = require("ethers/lib/utils")
const { BigNumber } = require("ethers")

describe('Signature test', () => {
  let deployer

  let addr1
  let addr2
  let addr3
  let addr4
  let addrs

  let signatureInstance;

  beforeEach(async () => {
    [deployer, addr1, addr2, addr3, addr4, ...addrs] = await ethers.getSigners();

    let signatureFactory = await ethers.getContractFactory("SignatureTestContract")
    signatureInstance = await signatureFactory.deploy()
  })

  it('should validate marketplace nonce', async () => {
    const nonce = await createNonce(10, 1, 10)

    console.log({ nonce });

    const isValid = await signatureInstance.isValidNonceRequest(
      nonce.request
    )
    console.log({isValid});

  })

})