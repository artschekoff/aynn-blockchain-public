import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { Contract } from 'ethers';
import hh, { ethers } from 'hardhat';
import { ContractAttacher } from 'scripts/deploy/buildUtils';
const { expect } = require("chai");

const weth9 = require('@ethereum-artifacts/weth9')
const factoryArtifact = require("@uniswap/v2-core/build/UniswapV2Factory.json");
const pairArtifact = require("@uniswap/v2-periphery/build/IUniswapV2Pair.json");
const routerArtifact = require("@uniswap/v2-periphery/build/IUniswapV2Router02.json");


const UNISWAP_ROUTER_ADDRESS = '0x425141165d3DE9FEC831896C016617a52363b687'
const UNISWAP_FACTORY_ADDRESS = '0xB7f907f7A9eBC822a80BD25E224be42Ce0A698A0'
const WETH_ADDRESS = '0xfff9976782d46cc05630d1f6ebab18b2324d6b14'

const DEPLOYMENT_ADDRESSES: Record<string, Record<string, string>> = {
  'sepolia': {
    'GLDToken': '0xeD7419b058845631e90407b09E6E1895A0f33022',
    'UniswapV2Factory': '0x9f8a82db6e08720fd6c797d39b5bc9f9c498d0bd',
  }
}

const WETH_AMOUNT = '0.05'
const GLD_AMOUNT = '100'

const deployGldToken = async () => {

  const gldTokenInstance = new ContractAttacher(DEPLOYMENT_ADDRESSES, hh.network.name)
    .attachOrDeploy('GLDToken', ethers.utils.parseUnits('100'))

  console.log('here', ethers.utils.parseUnits('100'));

  return gldTokenInstance
}

const getUniswapFactory = async (deployer: any) => {
  const factoryAddress = DEPLOYMENT_ADDRESSES[hh.network.name]?.UniswapV2Factory

  let contract: Contract | null = null

  if (factoryAddress) {
    console.log(`[x] Loading factory contract at address ${factoryAddress}...`);
    const contractMeta = new ethers.Contract(factoryAddress, factoryArtifact.abi, deployer)
    contract = await contractMeta.deployed()
  } else {
    console.log('[x] Deploying factory contract...');

    let factory = new ethers.ContractFactory(
      factoryArtifact.abi,
      factoryArtifact.bytecode,
      deployer
    )

    contract = await factory.deploy(deployer.address)

    console.log(`[x] New factory has been deployed: ${contract.address}`);
  }

  return contract
}

const getUniswapRouter = async (deployer: any) => {
  // let router = new ethers.Contract(
  //   UNISWAP_ROUTER_ADDRESS,
  //   [
  //     "function createPair(address tokenA, address tokenB) external returns (address pair)",
  //     "function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut) external pure returns (uint amountOut)",
  //     "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)",
  //     "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)"
  //   ],
  //   deployer
  // )

  let router = new ethers.Contract(
    UNISWAP_ROUTER_ADDRESS,
    routerArtifact.abi,
    deployer
  )


  await router.deployed()

  return router
}

const depositWeth = async (amount: any, deployer: any) => {

  const weth = new Contract(WETH_ADDRESS, weth9.WETH9.abi, deployer);

  const balanceOf = await weth.balanceOf(deployer.address)

  if (balanceOf.gte(amount)) {
    console.log('[x] Deployer has enough eth balance...', balanceOf.toString());
    return
  }

  let amountToSend = ethers.utils.parseUnits(amount).sub(balanceOf)

  console.log(`[x] Sending more ${amountToSend.toString()} eth to deployer...`);

  const tx = await weth.deposit({ value: amountToSend });
  await tx.wait();

  console.log("[x] WETH balance now:", (await weth.balanceOf(deployer.address)).toString());
}

const createPair = async (token: Contract, router: Contract, factory: Contract, deployer: SignerWithAddress) => {
  // Approve the router to spend tokens
  console.log("[x] Approving router to spend tokens...");
  await token.approve(UNISWAP_ROUTER_ADDRESS, ethers.utils.parseUnits(GLD_AMOUNT))
  await token.approve(factory.address, ethers.utils.parseUnits(GLD_AMOUNT))

  // Create pair
  console.log("[x] Creating pair...");

  let pairAddress = ''
  try {
    pairAddress = await factory.getPair(token.address, WETH_ADDRESS)

    if (pairAddress === ethers.constants.AddressZero) {
      throw new Error('Zero pair address')
    }

  } catch (e) {
    console.log(`[x] Pair doesn't exist because of ${(e as Error).message}, creating one for ${token.address} and ${WETH_ADDRESS} ...`);

    const tx1 = await factory.createPair(token.address, WETH_ADDRESS, { gasLimit: 1000000 })
    await tx1.wait()

    pairAddress = await factory.getPair(token.address, WETH_ADDRESS)
  }

  console.log("[x] Pair address:", pairAddress);

  const pair = new Contract(pairAddress, pairArtifact.abi, deployer)

  // liquidity
  const token0Amount = ethers.utils.parseUnits(GLD_AMOUNT);
  const token1Amount = ethers.utils.parseUnits(WETH_AMOUNT);

  const deadline = Math.floor(Date.now() / 1000) + 10 * 60;

  console.log('[x] Adding liquidity...');

  const addLiquidityTx = await router
    .connect(deployer)
    .addLiquidity(
      token.address,
      WETH_ADDRESS,
      token0Amount,
      token1Amount,
      0,
      0,
      deployer.address,
      deadline,
      { gasLimit: 100000 }
    );

  await addLiquidityTx.wait();

  console.log('[x] Loading pair reserves...');
  const reserves = await pair.getReserves();
  console.log(`Reserves: ${reserves[0].toString()}, ${reserves[1].toString()}`);

  return pair
}

describe.only('Sandwich contract tests', () => {
  beforeEach(async () => {
    const networkName = hh.network.name

    // it is pointless to run this test in other networks
    if (networkName !== 'sepolia') {
      throw new Error("Run it only in sepolia test network")
    }
  })

  it('should exchange uniswap successfully', async () => {

    const [deployer] = await ethers.getSigners();

    const token = await deployGldToken()

    const router = await getUniswapRouter(deployer)

    console.log('[x] Depositing weth...');
    await depositWeth(ethers.utils.parseUnits(WETH_AMOUNT), deployer)

    console.log('[x] Making a factory...');
    const factory = await getUniswapFactory(deployer)

    console.log('[x] Making a pair...');
    const pair = await createPair(token, router, factory, deployer)
    return

    // Get token to ETH price
    console.log("[x] Router get amounts out...");

    const amountsOut = await router.getAmountsOut(ethers.utils.parseUnits("1", 18), [token.address, WETH_ADDRESS]);
    const amountOutMin = amountsOut[1].sub(amountsOut[1].div(10)); // 10% slippage

    // Perform the swap
    console.log("[x] Swapping tokens for ETH...");

    const tx = await router.swapExactTokensForETH(
      ethers.utils.parseUnits("1", 18),
      amountOutMin,
      [token.address, WETH_ADDRESS],
      deployer.address,
      Math.floor(Date.now() / 1000) + 60 * 10, // 10 minutes from now
      { gasLimit: 500000 }
    );

    console.log("Waiting for swap transaction to be mined...");
    const receipt = await tx.wait();

    console.log("Swap transaction receipt:", receipt);

    const balance = await deployer.getBalance();
    console.log("Deployer's ETH balance:", ethers.utils.formatEther(balance));
    expect(balance).to.be.gt(0);
  })
})

// import { FlashbotsBundleProvider } from '@flashbots/ethers-provider-bundle';
// import { ethers } from 'ethers';
// import { CONTRACTS, searcherWallet, wssProvider } from './src/constants.js';
// import { calcNextBlockBaseFee } from './src/utils.js';
// 
// // const provider = new ethers.providers.JsonRpcProvider('https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID');
// // data: '0xEncodedFallbackFunctionData', // Use ethers.utils.defaultAbiCoder to encode the data
// // const authSigner = new ethers.Wallet('YOUR_FLASHBOTS_AUTH_KEY');
// // const userSigner = new ethers.Wallet('YOUR_PRIVATE_KEY', provider);
// 
// const uniswapRouterAddress = '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD';
// const uniswapRouterABI = [/* Uniswap Router ABI here */];
// const uniswapRouter = new ethers.Contract(uniswapRouterAddress, uniswapRouterABI, searcherWallet);
// 
// const tokenA = 'TOKEN_A_ADDRESS_HERE'; // Address of the ERC20 token you're swapping from
// const tokenB = 'TOKEN_B_ADDRESS_HERE'; // Address of the ERC20 token you're swapping to
// const amountIn = ethers.utils.parseUnits('1', 'ether'); // Amount of `tokenA` you're swapping
// const amountOutMin = 0; // Minimum amount of `tokenB` you want to receive, set to 0 for simplicity
// const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from the current Unix time
// 
// async function checkUniswapSwap() {
//   // Approve the Uniswap Router to spend `tokenA`
//   const tokenAContract = new ethers.Contract(tokenA, ['function approve(address spender, uint256 amount) external returns (bool)'], wallet);
//   await tokenAContract.approve(uniswapRouterAddress, amountIn);
// 
//   // Execute the swap from `tokenA` to `tokenB`
//   const tx = await uniswapRouter.swapExactTokensForTokens(
//     amountIn,
//     amountOutMin,
//     [tokenA, tokenB],
//     wallet.address,
//     deadline
//   );
// 
//   const receipt = await tx.wait();
//   expect(receipt.status).to.equal(1); // Transaction success
// });
// 
// async function simulateExchangeTransaction() {
//   const flashbotsProvider = await FlashbotsBundleProvider.create(wssProvider, searcherWallet);
//   const nonce = await wssProvider.getTransactionCount(searcherWallet.address);
// 
//   const block = await wssProvider.getBlock()
//   const nextBaseFee = calcNextBlockBaseFee(block);
// 
//   const tx = {
//     chainId: 1,
//     to: CONTRACTS.SANDWICH,
//     data,
//     gasLimit: 250000,
//     nonce,
//     type: 2,
//     // maxPriorityFeePerGas: 0,
//     maxFeePerGas: nextBaseFee,
//     // gasLimit: ethers.BigNumber.from('10000000'), // Adjust as needed
//     // maxFeePerGas: ethers.utils.parseUnits('100', 'gwei'), // Adjust as needed
//     // maxPriorityFeePerGas: ethers.utils.parseUnits('2', 'gwei'), // Adjust as needed
//     maxPriorityFeePerGas: ethers.utils.parseUnits('6', 'gwei'), // Adjust as needed
//   };
// 
//   const blockNumber = await wssProvider.getBlockNumber()
//   const signedTransaction = await searcherWallet.signTransaction(tx);
//   const simulation = await flashbotsProvider.simulate([signedTransaction], blockNumber);
// 
//   if ('error' in simulation) {
//     console.error('Simulation Error:', simulation.error.message);
//   } else {
//     console.log('Simulation Successful:', simulation);
//   }
// }
// 
// simulateExchangeTransaction();
// 
// // function decodeInput() {
// //   const abi = new ethers.utils.AbiCoder()
// 
// //   const decoded = abi.decode([
// //     "address", "address", "uint128", "uint128", "uint8"],
// //     '0x041b41f11282fb5330700a6c8a67dd2c7ebb9b8adfa5097ab4b1'
// //   )
// 
// //   logInfoInspect('Decoded input', decoded)
// // }
// 
// // decodeInput();