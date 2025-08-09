import { ethers, network } from "hardhat";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Core Chain configuration with stCORE token addresses
const CORE_CHAIN_CONFIG = {
  core_mainnet: {
    chainId: 1116,
    name: "Core Mainnet",
    stakeHub: "0x0000000000000000000000000000000000001000", // Core Chain StakeHub
    coreAgent: "0x0000000000000000000000000000000000001001", // Core Chain Agent
    stCoreToken: "0xb3a8f0f0da9ffc65318aa39e55079796093029ad", // Real stCORE token
    defaultValidator: "0x7f461f8a1c35eDEcD6816e76Eb2E84eb661751eE", //Dao validator 2
  },
  // core_testnet2: {
  //   chainId: 1114,
  //   name: "Core Testnet",
  //   stakeHub: "0x0000000000000000000000000000000000001000", // Core Chain StakeHub
  //   coreAgent: "0x0000000000000000000000000000000000001001", // Core Chain Agent
  //   stCoreToken: process.env.CORE_TESTNET2_STCORE_TOKEN || "", // Mock stCORE token
  //   defaultValidator: process.env.CORE_TESTNET_VALIDATOR || "",
  // },
};

// Deployment configuration
const DEPLOYMENT_CONFIG = {
  vault: {
    name: "IWBTC Vault",
    symbol: "IWBTC",
    withdrawalFee: 100, // 1% (100 basis points)
    yieldRate: 800, // 8% annual yield (800 basis points)
  },
  strategy: {
    // Strategy config handled by CoreStrategy constructor
  },
};

async function main() {
  const currentNetwork = network.name as keyof typeof CORE_CHAIN_CONFIG;

  if (!CORE_CHAIN_CONFIG[currentNetwork]) {
    console.log("❌ This script only supports Core Chain networks");
    console.log("Supported networks: core_mainnet, core_testnet2");
    console.log(
      "Run: npx hardhat run scripts/deploy-vault-system.ts --network core_testnet2"
    );
    return;
  }

  const config = CORE_CHAIN_CONFIG[currentNetwork];
  const [deployer] = await ethers.getSigners();

  console.log(`🚀 Deploying Complete Vault System on ${config.name}`);
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`🌐 Chain ID: ${config.chainId}`);

  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Deployer balance: ${ethers.formatEther(balance)} CORE`);

  if (balance < ethers.parseEther("0.5")) {
    console.log("❌ Insufficient CORE balance for deployment");
    console.log("💡 Need at least 0.5 CORE for gas fees");
    return;
  }

  // Validate required addresses
  if (!config.defaultValidator) {
    console.log("❌ Default validator address not set");
    console.log(`Set ${currentNetwork.toUpperCase()}_VALIDATOR in .env file`);
    return;
  }

  // Handle stCORE token (deploy mock for testnet if not set)
  let stCoreTokenAddress = config.stCoreToken;

  // if (!stCoreTokenAddress && currentNetwork === "core_testnet2") {
  //   console.log("🏗️ Deploying Mock stCORE Token for testnet...");
  //   stCoreTokenAddress = await deployMockStCoreToken(deployer);
  // }

  if (!stCoreTokenAddress) {
    console.log("❌ stCORE token address not configured");
    console.log("For testnet: Will deploy mock token");
    console.log("For mainnet: Check CORE_MAINNET_STCORE_TOKEN");
    return;
  }

  console.log("\n📋 Deployment Configuration:");
  console.log(`  stCORE Token: ${stCoreTokenAddress}`);
  console.log(`  StakeHub: ${config.stakeHub}`);
  console.log(`  Core Agent: ${config.coreAgent}`);
  console.log(`  Default Validator: ${config.defaultValidator}`);
  console.log(`  Vault Name: ${DEPLOYMENT_CONFIG.vault.name}`);
  console.log(`  Vault Symbol: ${DEPLOYMENT_CONFIG.vault.symbol}`);

  try {
    // Step 1: Deploy CoreStrategy
    console.log("\n🎯 Step 1: Deploying CoreStrategy...");
    const CoreStrategyFactory = await ethers.getContractFactory("CoreStrategy");

    const coreStrategy = await CoreStrategyFactory.deploy(
      stCoreTokenAddress,
      config.stakeHub,
      config.coreAgent,
      config.defaultValidator
    );

    console.log("⏳ Waiting for CoreStrategy deployment...");
    await coreStrategy.waitForDeployment();
    const strategyAddress = await coreStrategy.getAddress();
    console.log(`✅ CoreStrategy deployed: ${strategyAddress}`);

    // Step 2: Deploy Vault
    console.log("\n🏦 Step 2: Deploying Vault...");
    const VaultFactory = await ethers.getContractFactory("Vault");

    const vault = await VaultFactory.deploy(
      stCoreTokenAddress, // underlying token (stCORE)
      DEPLOYMENT_CONFIG.vault.name, // name
      DEPLOYMENT_CONFIG.vault.symbol, // symbol
      deployer.address, // manager
      deployer.address, // agent (initially)
      DEPLOYMENT_CONFIG.vault.withdrawalFee, // withdrawal fee
      DEPLOYMENT_CONFIG.vault.yieldRate, // yield rate
      deployer.address // treasury
    );

    console.log("⏳ Waiting for Vault deployment...");
    await vault.waitForDeployment();
    const vaultAddress = await vault.getAddress();
    console.log(`✅ Vault deployed: ${vaultAddress}`);

    // Step 3: Connect Strategy and Vault
    console.log("\n🔗 Step 3: Connecting Strategy and Vault...");

    // Set vault in strategy
    console.log("Setting vault in CoreStrategy...");
    const setVaultTx = await coreStrategy.setVault(vaultAddress);
    await setVaultTx.wait();
    console.log("✅ Vault set in CoreStrategy");

    // Add strategy to vault
    console.log("Adding CoreStrategy to vault...");
    const addStrategyTx = await vault.addStrategy(strategyAddress);
    await addStrategyTx.wait();
    console.log("✅ CoreStrategy added to vault");

    // Step 4: Verify deployment
    console.log("\n🔍 Step 4: Verifying deployment...");

    // Verify strategy
    const strategyUnderlyingToken = await coreStrategy.underlyingToken();
    const strategyVault = await coreStrategy.vault();
    const strategyDefaultValidator = await coreStrategy.defaultValidator();
    const strategyPaused = await coreStrategy.paused();

    console.log("📊 CoreStrategy verification:");
    console.log(`  Underlying Token: ${strategyUnderlyingToken}`);
    console.log(`  Vault: ${strategyVault}`);
    console.log(`  Default Validator: ${strategyDefaultValidator}`);
    console.log(`  Paused: ${strategyPaused}`);

    // Verify vault
    const vaultName = await vault.name();
    const vaultSymbol = await vault.symbol();
    const vaultAsset = await vault.asset();
    const vaultTotalAssets = await vault.totalAssets();
    const vaultTotalSupply = await vault.totalSupply();

    console.log("📊 Vault verification:");
    console.log(`  Name: ${vaultName}`);
    console.log(`  Symbol: ${vaultSymbol}`);
    console.log(`  Asset: ${vaultAsset}`);
    console.log(
      `  Total Assets: ${ethers.formatEther(vaultTotalAssets)} stCORE`
    );
    console.log(
      `  Total Supply: ${ethers.formatEther(vaultTotalSupply)} ${vaultSymbol}`
    );

    // // Step 5: Deploy VaultFactory (optional)
    // if (process.env.DEPLOY_VAULT_FACTORY === "true") {
    //   console.log("\n🏭 Step 5: Deploying VaultFactory...");

    //   const VaultFactoryContract = await ethers.getContractFactory(
    //     "VaultFactory"
    //   );
    //   const vaultFactory = await VaultFactoryContract.deploy(
    //     deployer.address, // default manager
    //     deployer.address, // default agent
    //     100, // default withdrawal fee (1%)
    //     ethers.parseEther("0.01"), // creation fee (0.01 CORE)
    //     deployer.address,
    //     deployer.address // treasury
    //   );

    //   await vaultFactory.waitForDeployment();
    //   const factoryAddress = await vaultFactory.getAddress();
    //   console.log(`✅ VaultFactory deployed: ${factoryAddress}`);
    // }

    // Final summary
    console.log("\n🎉 Deployment Summary:");
    console.log("=".repeat(50));
    console.log(`Network: ${config.name}`);
    console.log(`stCORE Token: ${stCoreTokenAddress}`);
    console.log(`CoreStrategy: ${strategyAddress}`);
    console.log(`Vault: ${vaultAddress}`);
    console.log(`Default Validator: ${config.defaultValidator}`);

    console.log("\n💾 Environment Variables:");
    console.log("Add these to your .env file:");
    console.log(
      `${currentNetwork.toUpperCase()}_STCORE_TOKEN=${stCoreTokenAddress}`
    );
    console.log(
      `${currentNetwork.toUpperCase()}_CORE_STRATEGY=${strategyAddress}`
    );
    console.log(`${currentNetwork.toUpperCase()}_VAULT=${vaultAddress}`);

    console.log("\n🎯 Next Steps:");
    console.log(`1. Update .env with the addresses above`);
    console.log(
      `2. Get stCORE tokens: npm run tokens:core-${
        currentNetwork.includes("testnet") ? "testnet" : "mainnet"
      }`
    );
    console.log(
      `3. Check status: npm run status:core-${
        currentNetwork.includes("testnet") ? "testnet" : "mainnet"
      }`
    );
    console.log(
      `4. Test interaction: npm run interact:core-${
        currentNetwork.includes("testnet") ? "testnet" : "mainnet"
      }`
    );
  } catch (error) {
    console.error("❌ Deployment failed:", error);

    if (error instanceof Error) {
      console.error("Error details:", error.message);

      if (error.message.includes("insufficient funds")) {
        console.log("💡 Solution: Add more CORE tokens to your wallet");
      } else if (error.message.includes("nonce")) {
        console.log("💡 Solution: Wait a moment and try again (nonce issue)");
      } else if (error.message.includes("gas")) {
        console.log("💡 Solution: Increase gas limit or gas price");
      }
    }

    process.exit(1);
  }
}

// Helper function to deploy mock stCORE token for testnet
async function deployMockStCoreToken(deployer: any): Promise<string> {
  console.log("🏗️ Deploying Mock stCORE Token...");

  const MockERC20Factory = await ethers.getContractFactory("MockERC20");

  const mockStCore = await MockERC20Factory.deploy(
    "Staked CORE Token", // name
    "stCORE", // symbol
    18 // decimals
  );

  await mockStCore.waitForDeployment();
  const tokenAddress = await mockStCore.getAddress();

  console.log(`✅ Mock stCORE deployed: ${tokenAddress}`);

  // Mint initial supply to deployer
  const initialSupply = ethers.parseEther("1000000"); // 1M stCORE tokens
  const mintTx = await mockStCore.mint(deployer.address, initialSupply);
  await mintTx.wait();

  console.log(
    `✅ Minted ${ethers.formatEther(initialSupply)} stCORE tokens to deployer`
  );

  return tokenAddress;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
