import hh from 'hardhat';
import { ContractAttacher, clearBuildFolder, toWei } from './buildUtils';

const SANDWICH_CONTRACT = 'Sandwich'

const ADDRESSES_MAINNET = {
  // [SANDWICH_CONTRACT]: '0xdfa7d1f056d268cbd6c1731ee459c06093ba2b71',
  [SANDWICH_CONTRACT]: '0x71d89799aa7eB46B39AE915951EFbDd92Ac1a7e3',
}

const DEPLOYMENT_ADDRESSES = {
  'mainnet': ADDRESSES_MAINNET,
}

const CURRENCY = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
// const CURRENCY = '0x0000000000000000000000000000000000000000'
// const CURRENCY = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'


async function deploy() {
  const networkName = hh.network.name

  const attacher = new ContractAttacher(DEPLOYMENT_ADDRESSES, networkName)

  const [deployer] = await hh.ethers.getSigners()

  console.log('Current account', deployer.address)
  console.log('Account balance:', (await deployer.getBalance()).toString())

  const sandwich = await attacher.attachOrDeploy(SANDWICH_CONTRACT, '0x83cF0F761F77334565a2B7D80aA0d3aB9a2b09D2')

  // console.log({ sandwich });

  // weth address
  await sandwich.recoverETH({ gasLimit: 120000 })
  // await sandwich.recoverETH({ gasLimit: 120000 })
  // await sandwich.recoverERC20(CURRENCY, { gasLimit: 120000 })
}



clearBuildFolder().then(() => deploy())
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
