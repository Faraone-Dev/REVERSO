import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    // ═══════════════════════════════════════════════════════════════
    //                         TESTNETS
    // ═══════════════════════════════════════════════════════════════
    sepolia: {
      url: process.env.SEPOLIA_RPC || "https://ethereum-sepolia-rpc.publicnode.com",
      chainId: 11155111,
      accounts: [PRIVATE_KEY],
    },
    arbitrumSepolia: {
      url: process.env.ARBITRUM_SEPOLIA_RPC || "https://sepolia-rollup.arbitrum.io/rpc",
      chainId: 421614,
      accounts: [PRIVATE_KEY],
    },
    baseSepolia: {
      url: process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org",
      chainId: 84532,
      accounts: [PRIVATE_KEY],
    },

    // ═══════════════════════════════════════════════════════════════
    //                         MAINNETS
    // ═══════════════════════════════════════════════════════════════
    ethereum: {
      url: process.env.ETHEREUM_RPC || "https://ethereum-rpc.publicnode.com",
      chainId: 1,
      accounts: [PRIVATE_KEY],
    },
    arbitrum: {
      url: process.env.ARBITRUM_RPC || "https://arb1.arbitrum.io/rpc",
      chainId: 42161,
      accounts: [PRIVATE_KEY],
    },
    optimism: {
      url: process.env.OPTIMISM_RPC || "https://mainnet.optimism.io",
      chainId: 10,
      accounts: [PRIVATE_KEY],
    },
    base: {
      url: process.env.BASE_RPC || "https://mainnet.base.org",
      chainId: 8453,
      accounts: [PRIVATE_KEY],
    },
    polygon: {
      url: process.env.POLYGON_RPC || "https://polygon-rpc.com",
      chainId: 137,
      accounts: [PRIVATE_KEY],
    },
    bsc: {
      url: process.env.BSC_RPC || "https://bsc-dataseed.binance.org",
      chainId: 56,
      accounts: [PRIVATE_KEY],
    },
    avalanche: {
      url: process.env.AVALANCHE_RPC || "https://api.avax.network/ext/bc/C/rpc",
      chainId: 43114,
      accounts: [PRIVATE_KEY],
    },
    fantom: {
      url: process.env.FANTOM_RPC || "https://rpc.ftm.tools",
      chainId: 250,
      accounts: [PRIVATE_KEY],
    },
    zksync: {
      url: process.env.ZKSYNC_RPC || "https://mainnet.era.zksync.io",
      chainId: 324,
      accounts: [PRIVATE_KEY],
    },
    linea: {
      url: process.env.LINEA_RPC || "https://rpc.linea.build",
      chainId: 59144,
      accounts: [PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY || "",
      sepolia: process.env.ETHERSCAN_API_KEY || "",
      arbitrumOne: process.env.ARBISCAN_API_KEY || "",
      arbitrumSepolia: process.env.ARBISCAN_API_KEY || "",
      optimisticEthereum: process.env.OPTIMISM_API_KEY || "",
      base: process.env.BASESCAN_API_KEY || "",
      polygon: process.env.POLYGONSCAN_API_KEY || "",
      bsc: process.env.BSCSCAN_API_KEY || "",
      avalanche: process.env.SNOWTRACE_API_KEY || "",
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
