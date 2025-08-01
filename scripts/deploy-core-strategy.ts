import { ethers, network } from "hardhat";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Core Chain network configuration
const CORE_CHAIN_CONFIG = {
  core_mainnet: {
    chainId: 1116,
    name: "Core Mainnet",
    stakeHub: "0x0000000000000000000000000000000000001000", // Core Chain StakeHub
    coreAgent: "0x0000000000000000000000000000000000001001", // Core Chain Agent
    stCoreToken: "0xb3a8f0f0da9ffc65318aa39e55079796093029ad", // stCORE token mainnet
    defaultValidator: process.env.CORE_MAINNET_VALIDATOR || "",
  },
  core_testnet2: {
    chainId: 1114,
    name: "Core Testnet",
    stakeHub: "0x0000000000000000000000000000000000001000", // Core Chain StakeHub
    coreAgent: "0x0000000000000000000000000000000000001001", // Core Chain Agent
    stCoreToken: process.env.CORE_TESTNET2_STCORE_TOKEN || "", // Mock stCORE token testnet
    defaultValidator: process.env.CORE_TESTNET_VALIDATOR || "",
  },
};

async function main() {
  const currentNetwork = network.name as keyof typeof CORE_CHAIN_CONFIG;

  if (!CORE_CHAIN_CONFIG[currentNetwork]) {
    console.log("❌ This script only supports Core Chain networks");
    console.log("Supported networks: core_mainnet, core_testnet2");
    console.log(
      "Run: npx hardhat run scripts/deploy-core-strategy.ts --network core_testnet2"
    );
    return;
  }

  const config = CORE_CHAIN_CONFIG[currentNetwork];
  const [deployer] = await ethers.getSigners();

  console.log(`🚀 Deploying CoreStrategy on ${config.name}`);
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`🌐 Chain ID: ${config.chainId}`);

  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Deployer balance: ${ethers.formatEther(balance)} CORE`);

  if (balance < ethers.parseEther("0.1")) {
    console.log("❌ Insufficient CORE balance for deployment");
    return;
  }

  // Validate required addresses
  if (!config.defaultValidator) {
    console.log("❌ Default validator address not set");
    console.log(`Set ${currentNetwork.toUpperCase()}_VALIDATOR in .env file`);
    return;
  }

  console.log("\n📋 Configuration:");
  console.log(`  stCORE Token: ${config.stCoreToken}`);
  console.log(`  StakeHub: ${config.stakeHub}`);
  console.log(`  Core Agent: ${config.coreAgent}`);
  console.log(`  Default Validator: ${config.defaultValidator}`);

  try {
    // Deploy CoreStrategy
    console.log("\n🏗️ Deploying CoreStrategy...");
    const CoreStrategyFactory = await ethers.getContractFactory("CoreStrategy");

    const coreStrategy = await CoreStrategyFactory.deploy(
      config.stCoreToken,
      config.stakeHub,
      config.coreAgent,
      config.defaultValidator
    );

    console.log("⏳ Waiting for deployment...");
    await coreStrategy.waitForDeployment();

    const strategyAddress = await coreStrategy.getAddress();
    console.log(`✅ CoreStrategy deployed at: ${strategyAddress}`);

    // Verify deployment
    console.log("\n🔍 Verifying deployment...");
    const underlyingToken = await coreStrategy.underlyingToken();
    const stakeHub = await coreStrategy.stakeHub();
    const coreAgent = await coreStrategy.coreAgent();
    const defaultValidator = await coreStrategy.defaultValidator();

    console.log("📊 Contract state:");
    console.log(`  Underlying Token: ${underlyingToken}`);
    console.log(`  StakeHub: ${stakeHub}`);
    console.log(`  Core Agent: ${coreAgent}`);
    console.log(`  Default Validator: ${defaultValidator}`);
    console.log(`  Vault: ${await coreStrategy.vault()}`);
    console.log(`  Paused: ${await coreStrategy.paused()}`);

    // Save deployment info
    console.log("\n💾 Deployment Summary:");
    console.log("Add these to your .env file:");
    console.log(
      `${currentNetwork.toUpperCase()}_CORE_STRATEGY=${strategyAddress}`
    );
    console.log(
      `${currentNetwork.toUpperCase()}_STCORE_TOKEN=${config.stCoreToken}`
    );

    // Optional: Deploy a test vault if requested
    if (process.env.DEPLOY_TEST_VAULT === "true") {
      console.log("\n🏦 Deploying test vault...");

      const VaultFactory = await ethers.getContractFactory("Vault");
      const vault = await VaultFactory.deploy(
        config.stCoreToken, // underlying token (stCORE)
        "stCORE Vault", // name
        "vstCORE", // symbol
        deployer.address, // manager
        deployer.address, // agent
        100, // 1% withdrawal fee
        500, // 5% annual yield
        deployer.address // treasury
      );

      await vault.waitForDeployment();
      const vaultAddress = await vault.getAddress();

      console.log(`✅ Test Vault deployed at: ${vaultAddress}`);

      // Set vault in strategy
      console.log("🔗 Connecting strategy to vault...");
      await coreStrategy.setVault(vaultAddress);

      // Add strategy to vault
      await vault.addStrategy(strategyAddress);

      console.log("✅ Strategy and vault connected!");
      console.log(`${currentNetwork.toUpperCase()}_VAULT=${vaultAddress}`);
    }

    console.log("\n🎉 Deployment completed successfully!");
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
