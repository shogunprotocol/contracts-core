import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-ignition-ethers";
import "dotenv/config";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.26",
        settings: {
          evmVersion: "shanghai",
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
    core_testnet2: {
      url: "https://rpc.test2.btcs.network",
      accounts: process.env.PRIV_KEY ? [process.env.PRIV_KEY] : [],
      chainId: 1114,
    },
    ...(process.env.PRIV_KEY && {
      core_mainnet: {
        url: "https://rpc.coredao.org/",
        accounts: [process.env.PRIV_KEY],
        chainId: 1116,
      },
    }),
  },
  ...((process.env.CORE_TEST2_SCAN_KEY || process.env.CORE_MAIN_SCAN_KEY) && {
    etherscan: {
      apiKey: {
        ...(process.env.CORE_TEST2_SCAN_KEY && {
          core_testnet2: process.env.CORE_TEST2_SCAN_KEY,
        }),
        ...(process.env.CORE_MAIN_SCAN_KEY && {
          core_mainnet: process.env.CORE_MAIN_SCAN_KEY,
        }),
      },
      customChains: [
        {
          network: "core_testnet2",
          chainId: 1114,
          urls: {
            apiURL: "https://api.test2.btcs.network/api",
            browserURL: "https://scan.test2.btcs.network/",
          },
        },
        {
          network: "core_mainnet",
          chainId: 1116,
          urls: {
            apiURL: "https://openapi.coredao.org/api",
            browserURL: "https://scan.coredao.org/",
          },
        },
      ],
    },
  }),
  ignition: {
    requiredConfirmations: 1,
  },
};

export default config;
