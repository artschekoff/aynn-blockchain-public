import '@nomiclabs/hardhat-waffle';
import '@nomicfoundation/hardhat-verify';
import 'hardhat-contract-sizer';
import 'hardhat-gas-reporter';
import 'hardhat-watcher';
import "tsconfig-paths/register";
import dotenv from 'dotenv';
import { HardhatUserConfig, NetworkUserConfig } from 'hardhat/types';

dotenv.config()

type CustomNetwork = NetworkUserConfig & {
  ledgerAccounts?: string[]
} | undefined;


type CustomHardhatUserConfig = Omit<HardhatUserConfig, 'networks'> & {
  networks: Record<string, CustomNetwork>,
  gasReporter: any,
  contractSizer: any,
  watcher: any,
  ci: any
}

const config: CustomHardhatUserConfig = {
  solidity: {
    version: '0.8.7',
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
        details: { yul: false }
      },
    }
  },
  etherscan: {
    apiKey: {
      sepolia: '',
      opera: ''
    }
  },
  networks: {
    mainnet: {
      url: 'https://mainnet.infura.io/v3/',
      accounts: [''],
    },
    // hardhat: {
    //   allowUnlimitedContractSize: true,
    // },
    sepolia: {
      // url: 'https://sepolia.infura.io/v3/',
      url: 'https://eth-sepolia.g.alchemy.com/v2/',
      ledgerAccounts: [
        ""
      ],
      accounts: ['']
    },
    fantom: {
      url: "https://rpc.ankr.com/fantom",
      ledgerAccounts: [
        ""
      ]
    }
  },
  paths: {
    artifacts: './src/artifacts',
    sources: './src/contracts',
    cache: './src/cache',
    tests: './test',
  },
  gasReporter: {
    // enabled: process.env.REPORT_GAS ? true : false,
    enabled: true,
    // token: 'MATIC',
    // gasPriceApi: 'https://api.polygonscan.com/api?module=proxy&action=eth_gasPrice',
    // gasPriceApi: 'https://api.etherscan.io/api?module=gastracker&action=gasestimate&gasprice=2000000000&apikey=YourApiKeyToken',
    currency: 'USD',
    // currency: 'ETH',
    gasPrice: 20,
    coinmarketcap: '',
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true,
    // only: [':AynnMarketplace.*$'],
  },
  watcher: {
    compilation: {
      tasks: ['compile'],
      files: ['./contracts'],
      ignoredFiles: ['**/.vscode'],
      verbose: true,
      clearOnStart: true,
      start: 'echo Running my compilation task now..',
    },
    test: {
      tasks: [{ command: 'test', params: { testFiles: ['{path}'] } }],
      files: ['./test/**/*'],
      verbose: true,
      clearOnStart: true,
      start: 'echo Running my test task now..',
    }
  },
  ci: {
    tasks: [
      'clean',
      { command: 'compile', params: { quiet: true } },
      { command: 'test', params: { noCompile: true, testFiles: ['testfile.ts'] } },
    ],
  }
}

export default config