const { Wallet } = require("ethers");
const { ethers } = require("hardhat");

const toWei = (num) => ethers.utils.parseEther(num.toString())
const fromWei = (num) => ethers.utils.formatEther(num)
const weiToNumber = (num, fixNum = 3) => parseFloat((+fromWei(num)).toFixed(fixNum))
const toFixed = (num, fixNum = 3) => parseFloat((num).toFixed(fixNum))

const getAccPrivateKey = (_index = 0) => {
  const accounts = config.networks.hardhat.accounts;
  const wallet = ethers.Wallet.fromMnemonic(accounts.mnemonic, accounts.path + `/${_index}`);
  return wallet.privateKey
}

const emptyNonce = [
  ethers.constants.AddressZero,
  [],
  0,
  0
]

const createNonce = async (_value = 0, _accIndex = 0, _minutesValid = 10) => {
  const signers = await ethers.getSigners()

  const privateKey = getAccPrivateKey(_accIndex)
  const wallet = new Wallet(privateKey)

  var d = new Date();
  var seconds = Math.round(d.getTime() / 1000)
  var validTill = seconds + _minutesValid * 60

  const signer = signers[_accIndex].address

  let message = ethers.utils.solidityPack(['address', 'uint256', 'uint32'], [signer, toWei(_value), validTill])

  message = ethers.utils.solidityKeccak256(["bytes"], [message]);

  const signature = await wallet.signMessage(ethers.utils.arrayify(message))

  return {
    value: toWei(_value),
    request: [
      signer,
      signature,
      toWei(_value),
      validTill
    ],
    attestor: signer,
    signer: signer,
    signature
  }

  // var recovered = await distributedMarketplaceInstance.recoverSigner(
  //   30,
  //   signature
  // )
}

module.exports = {
  getAccPrivateKey,
  createNonce,
  emptyNonce,
  toWei,
  fromWei,
  weiToNumber,
  toFixed
}