import { ethers, network } from "hardhat";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Network configuration - Chainlink price feed addresses for each network
const NETWORK_CONFIG = {
  ethereum: {
    btcUsdFeed:
      process.env.ETHEREUM_BTC_USD_FEED ||
      "0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c",
    ethUsdFeed:
      process.env.ETHEREUM_ETH_USD_FEED ||
      "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
    linkUsdFeed:
      process.env.ETHEREUM_LINK_USD_FEED ||
      "0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c",
  },
  sepolia: {
    btcUsdFeed:
      process.env.SEPOLIA_BTC_USD_FEED ||
      "0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43",
    ethUsdFeed:
      process.env.SEPOLIA_ETH_USD_FEED ||
      "0x694AA1769357215DE4FAC081bf1f309aDC325306",
    linkUsdFeed:
      process.env.SEPOLIA_LINK_USD_FEED ||
      "0xc59E3633BAAC79493d908e63626716e204A45EdF",
  },
  arbitrum: {
    btcUsdFeed:
      process.env.ARBITRUM_BTC_USD_FEED ||
      "0x6ce185860a4963106506C203335A2910413708e9",
    ethUsdFeed:
      process.env.ARBITRUM_ETH_USD_FEED ||
      "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612",
    linkUsdFeed:
      process.env.ARBITRUM_LINK_USD_FEED ||
      "0x86E53CF1B870786351Da77A57575e79CB55812CB",
  },
  arbitrumSepolia: {
    btcUsdFeed:
      process.env.ARBITRUM_SEPOLIA_BTC_USD_FEED ||
      "0x56a43EB56Da12C0dc1D972ACb089c06a5dEF8e69",
    ethUsdFeed:
      process.env.ARBITRUM_SEPOLIA_ETH_USD_FEED ||
      "0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165",
    linkUsdFeed:
      process.env.ARBITRUM_SEPOLIA_LINK_USD_FEED ||
      "0xb113F5A928BCfF189C998ab20d753a47F9dE5A61",
  },
  base: {
    btcUsdFeed:
      process.env.BASE_BTC_USD_FEED ||
      "0x64c911996D3c6aC71f9b455B1E8E7266BcbD848F",
    ethUsdFeed:
      process.env.BASE_ETH_USD_FEED ||
      "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",
    linkUsdFeed:
      process.env.BASE_LINK_USD_FEED ||
      "0xFdB631F5EE196F0ed6FAa767959853A9F217697D",
  },
  baseSepolia: {
    btcUsdFeed:
      process.env.BASE_SEPOLIA_BTC_USD_FEED ||
      "0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1",
    ethUsdFeed:
      process.env.BASE_SEPOLIA_ETH_USD_FEED ||
      "0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1",
    linkUsdFeed:
      process.env.BASE_SEPOLIA_LINK_USD_FEED ||
      "0xb113F5A928BCfF189C998ab20d753a47F9dE5A61",
  },
  avalanche: {
    btcUsdFeed: process.env.AVALANCHE_BTC_USD_FEED || "",
    ethUsdFeed: process.env.AVALANCHE_ETH_USD_FEED || "",
    linkUsdFeed: process.env.AVALANCHE_LINK_USD_FEED || "",
  },
  fuji: {
    btcUsdFeed: process.env.FUJI_BTC_USD_FEED || "",
    ethUsdFeed: process.env.FUJI_ETH_USD_FEED || "",
    linkUsdFeed: process.env.FUJI_LINK_USD_FEED || "",
  },
  flow: {
    btcUsdFeed:
      process.env.FLOW_BTC_USD_FEED ||
      "0x0000000000000000000000000000000000000001",
    ethUsdFeed:
      process.env.FLOW_ETH_USD_FEED ||
      "0x0000000000000000000000000000000000000002",
    linkUsdFeed:
      process.env.FLOW_LINK_USD_FEED ||
      "0x0000000000000000000000000000000000000003",
  },
  flowTestnet: {
    btcUsdFeed:
      process.env.FLOW_TESTNET_BTC_USD_FEED ||
      "0x0000000000000000000000000000000000000001",
    ethUsdFeed:
      process.env.FLOW_TESTNET_ETH_USD_FEED ||
      "0x0000000000000000000000000000000000000002",
    linkUsdFeed:
      process.env.FLOW_TESTNET_LINK_USD_FEED ||
      "0x0000000000000000000000000000000000000003",
  },
  hardhat: {
    btcUsdFeed: "0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43",
    ethUsdFeed: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
    linkUsdFeed: "0xc59E3633BAAC79493d908e63626716e204A45EdF",
  },
  localhost: {
    btcUsdFeed: "0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43",
    ethUsdFeed: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
    linkUsdFeed: "0xc59E3633BAAC79493d908e63626716e204A45EdF",
  },
};

async function deployMockTokens() {
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const MockWBTC = await ethers.getContractFactory("MockWBTC");
  const MockWETH = await ethers.getContractFactory("MockWETH");

  const usdc = await MockUSDC.deploy();
  const wbtc = await MockWBTC.deploy();
  const weth = await MockWETH.deploy();

  await Promise.all([
    usdc.waitForDeployment(),
    wbtc.waitForDeployment(),
    weth.waitForDeployment(),
  ]);

  return {
    usdc: await usdc.getAddress(),
    wbtc: await wbtc.getAddress(),
    weth: await weth.getAddress(),
  };
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const networkName = network.name;

  console.log(`🚀 Deploying to ${networkName.toUpperCase()}`);
  console.log(`📍 Deployer: ${deployer.address}`);

  const config = NETWORK_CONFIG[networkName as keyof typeof NETWORK_CONFIG];
  if (!config) {
    throw new Error(`❌ Network '${networkName}' not supported`);
  }

  if (!config.btcUsdFeed || !config.ethUsdFeed || !config.linkUsdFeed) {
    throw new Error(
      `❌ Chainlink price feeds not configured for ${networkName}`
    );
  }

  const tokens = await deployMockTokens();
  console.log(`✅ Mock tokens deployed`);

  const manager = process.env.MANAGER_ADDRESS || deployer.address;
  const agent = process.env.AGENT_ADDRESS || deployer.address;
  const vaultName = process.env.VAULT_NAME || "Multi-Token Vault";
  const vaultSymbol = process.env.VAULT_SYMBOL || "mtvUSDC";

  const MultiTokenVault = await ethers.getContractFactory("MultiTokenVault");
  const vault = await MultiTokenVault.deploy(
    tokens.usdc,
    manager,
    agent,
    vaultName,
    vaultSymbol
  );

  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();

  // Configure tokens
  await vault.configureToken(tokens.usdc, ethers.ZeroAddress, 6);
  await vault.configureToken(tokens.wbtc, config.btcUsdFeed, 8);
  await vault.configureToken(tokens.weth, config.ethUsdFeed, 18);

  console.log(`✅ MultiTokenVault deployed: ${vaultAddress}`);
  console.log(`📋 Contract Addresses:`);
  console.log(`  Vault: ${vaultAddress}`);
  console.log(`  USDC: ${tokens.usdc}`);
  console.log(`  WBTC: ${tokens.wbtc}`);
  console.log(`  WETH: ${tokens.weth}`);

  console.log(`\n📝 Environment Variables:`);
  console.log(`${networkName.toUpperCase()}_VAULT_ADDRESS=${vaultAddress}`);
  console.log(`${networkName.toUpperCase()}_USDC_ADDRESS=${tokens.usdc}`);
  console.log(`${networkName.toUpperCase()}_WBTC_ADDRESS=${tokens.wbtc}`);
  console.log(`${networkName.toUpperCase()}_WETH_ADDRESS=${tokens.weth}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`❌ Deployment failed: ${error.message}`);
    process.exit(1);
  });
