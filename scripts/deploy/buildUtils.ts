import { ethers } from "ethers"
import { artifacts } from "hardhat"
const prompt = require("prompt-sync")({ sigint: true });


const fsExtra = require('fs-extra')
const path = require('path')
const hh = require('hardhat')

const defaultBuildFolder = path.join(process.env.INIT_CWD, 'build')

export class ContractAttacher {
  addressDict: {}
  chainName: string

  constructor(addressDict = {}, chainName = '') {
    this.addressDict = addressDict
    this.chainName = chainName
  }

  attachOrDeploy(contactKey: string, ...args: any) {
    return attachOrDeploy(contactKey, this.addressDict, this.chainName, ...args);
  }
}

export async function deployContracts(contracts: string[], ...params: any) {
  console.log('Deploying contracts...' + contracts.join(', '))

  let nftContractFactories = await Promise.all(contracts.map(async (x) => ({
    contract: x,
    deployed: await (await hh.ethers.getContractFactory(x)).deploy(...params)
  })))

  Promise.all(nftContractFactories.map((x => saveFrontendFiles(x.deployed, x.contract))))
}

async function attachOrDeploy(contractKey: string, addressDict: Record<string, Record<string, string>>, chainName: string, ...args: any) {
  console.log(`[AttachOrDeploy] ${contractKey} for ${chainName} loading...`)

  const factory = await hh.ethers.getContractFactory(contractKey)
  const deploymentAddress = addressDict?.[chainName]?.[contractKey]

  let instance;

  if (deploymentAddress) {
    instance = factory.attach(deploymentAddress)

    console.log(`[AttachOrDeploy] ${contractKey}: address found, Attaching...`);
    console.log(`${contractKey} has been attached: ${instance.address}`);
  } else {

    const userInput = prompt(`[AttachOrDeploy] ${contractKey}: address not found, Deploy? (Y/N) `);

    if (userInput !== 'Y') {
      console.log(`Exiting...`);
      return
    }

    instance = await factory.deploy(...args)

    console.log(`${contractKey} has been deployed: ${instance.address}`);
  }

  if (!deploymentAddress) {
    saveFrontendFiles(instance, contractKey)
  }


  return instance
}

export async function clearBuildFolder(buildFolder = defaultBuildFolder) {
  console.log("Clearing folder " + buildFolder);
  await fsExtra.emptyDir(buildFolder)
}

export function saveFrontendFiles(contract: ethers.Contract, name: string, buildFolder = defaultBuildFolder) {
  const fs = require('fs')


  if (!fs.existsSync(buildFolder)) {
    fs.mkdirSync(buildFolder)
  }

  fs.writeFileSync(
    buildFolder + `/${name}-address.json`,
    JSON.stringify({ address: contract.address }, undefined, 2)
  )

  const contractArtifact = artifacts.readArtifactSync(name)

  fs.writeFileSync(buildFolder + `/${name}.json`, JSON.stringify(contractArtifact, null, 2))

  console.log('Artifacts for contract ' + name + ' has been saved');
}

export const toWei = (num: number) => ethers.utils.parseEther(num.toString())
export const fromWei = (num: ethers.BigNumberish) => ethers.utils.formatEther(num)