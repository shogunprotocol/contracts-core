import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-ignition-ethers";
import "dotenv/config";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.13",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    arbitrum: {
      url: process.env.ARBITRUM_RPC_URL || "",
      accounts: process.env.PRIV_KEY ? [process.env.PRIV_KEY] : [],
      chainId: 42161,
    },
    base: {
      url: process.env.BASE_RPC_URL || "",
      accounts: process.env.PRIV_KEY ? [process.env.PRIV_KEY] : [],
      chainId: 8453,
    },
    avalanche: {
      url: process.env.AVALANCHE_RPC_URL || "",
      accounts: process.env.PRIV_KEY ? [process.env.PRIV_KEY] : [],
      chainId: 43114,
    },
    fuji: {
      url: process.env.FUJI_RPC_URL || "",
      accounts: process.env.PRIV_KEY ? [process.env.PRIV_KEY] : [],
      chainId: 43113,
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIV_KEY ? [process.env.PRIV_KEY] : [],
      chainId: 11155111,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  ignition: {
    requiredConfirmations: 1,
  },
};

export default config;
