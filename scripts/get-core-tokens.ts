import { ethers, network } from "hardhat";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Core Chain token addresses
const STCORE_TOKEN_ADDRESSES = {
  core_mainnet: "0xb3a8f0f0da9ffc65318aa39e55079796093029ad", // Real stCORE (stakedCORE) token
  core_testnet2:
    process.env.CORE_TESTNET2_STCORE_TOKEN ||
    "0x4D9D86fc6C4e44E5A88E7C9B8b9c7A4F9a4c8d9E", // Mock stCORE token for testing
};

// Default amounts
const AMOUNTS = {
  FAUCET_AMOUNT: ethers.parseEther("1000"), // 1000 CORE tokens
  MIN_BALANCE: ethers.parseEther("1"), // 1 CORE minimum
};

async function main() {
  const currentNetwork = network.name as keyof typeof STCORE_TOKEN_ADDRESSES;

  if (!STCORE_TOKEN_ADDRESSES[currentNetwork]) {
    console.log("❌ This script only supports Core Chain networks");
    console.log("Supported networks: core_mainnet, core_testnet2");
    console.log(
      "Run: npx hardhat run scripts/get-core-tokens.ts --network core_testnet2"
    );
    return;
  }

  const [user] = await ethers.getSigners();
  const stCoreTokenAddress = STCORE_TOKEN_ADDRESSES[currentNetwork];

  console.log(`🪙 Getting stCORE Tokens on ${network.name}`);
  console.log(`👤 Account: ${user.address}`);
  console.log(`🏗️ stCORE Token: ${stCoreTokenAddress}`);

  // Check current balances
  const nativeBalance = await ethers.provider.getBalance(user.address);
  console.log(`💰 Native Balance: ${ethers.formatEther(nativeBalance)} CORE`);

  try {
    // Connect to stCORE token contract
    const stCoreToken = await ethers.getContractAt(
      "MockERC20",
      stCoreTokenAddress
    );

    // Check current stCORE token balance
    const tokenBalance = await stCoreToken.balanceOf(user.address);
    console.log(
      `💰 stCORE Token Balance: ${ethers.formatEther(tokenBalance)} stCORE`
    );

    // Check if we need more tokens
    if (tokenBalance >= AMOUNTS.MIN_BALANCE) {
      console.log("✅ Sufficient stCORE token balance!");
      console.log(`📊 Current: ${ethers.formatEther(tokenBalance)} stCORE`);
      return;
    }

    console.log(`🚰 Attempting to get stCORE tokens...`);

    if (currentNetwork === "core_mainnet") {
      console.log("⚠️ Mainnet detected - cannot mint tokens");
      console.log("💡 Options for mainnet CORE tokens:");
      console.log("  1. Bridge from another chain");
      console.log("  2. Buy from decentralized exchanges");
      console.log("  3. Use Core Chain faucets (if available)");
      console.log("  4. Transfer from another wallet");
      return;
    }

    // For testnet, try to mint tokens
    console.log(
      `🚰 Minting ${ethers.formatEther(AMOUNTS.FAUCET_AMOUNT)} CORE tokens...`
    );

    try {
      // Try mint function (for mock tokens)
      const mintTx = await stCoreToken.mint(
        user.address,
        AMOUNTS.FAUCET_AMOUNT
      );
      await mintTx.wait();
      console.log("✅ Successfully minted CORE tokens!");
    } catch (mintError) {
      console.log("⚠️ Mint function not available, trying faucet...");

      try {
        // Try faucet function (alternative for test tokens)
        const faucetTx = await stCoreToken.faucet(AMOUNTS.FAUCET_AMOUNT);
        await faucetTx.wait();
        console.log("✅ Successfully got tokens from faucet!");
      } catch (faucetError) {
        console.log("❌ Neither mint nor faucet functions available");
        console.log("💡 This might be a real CORE token contract");
        console.log("📝 For testnet CORE tokens, try:");
        console.log("  1. Core Chain official faucet");
        console.log("  2. Discord/Telegram faucet bots");
        console.log("  3. Deploy a mock CORE token for testing");
        return;
      }
    }

    // Check final balance
    const finalBalance = await stCoreToken.balanceOf(user.address);
    const gained = finalBalance - tokenBalance;

    console.log("\n📊 Final Status:");
    console.log(
      `💰 CORE Token Balance: ${ethers.formatEther(finalBalance)} CORE`
    );
    console.log(`📈 Tokens Gained: ${ethers.formatEther(gained)} CORE`);

    if (finalBalance >= AMOUNTS.MIN_BALANCE) {
      console.log("✅ Ready for staking operations!");
      console.log("\n🎯 Next steps:");
      console.log(
        "  1. Deploy CoreStrategy: npx hardhat run scripts/deploy-core-strategy.ts --network",
        network.name
      );
      console.log(
        "  2. Interact with strategy: npx hardhat run scripts/interact-core-strategy.ts --network",
        network.name
      );
    }
  } catch (error) {
    console.error("❌ Failed to get CORE tokens:", error);

    if (currentNetwork === "core_testnet2") {
      console.log("\n💡 Alternative approaches for testnet:");
      console.log("  1. Deploy your own mock CORE token");
      console.log("  2. Use Core Chain testnet faucets");
      console.log("  3. Bridge test tokens from other testnets");
    }
  }
}

// Helper function to deploy mock CORE token if needed
async function deployMockCoreToken() {
  console.log("🏗️ Deploying Mock CORE Token...");

  const [deployer] = await ethers.getSigners();
  const MockERC20Factory = await ethers.getContractFactory("MockERC20");

  const mockCore = await MockERC20Factory.deploy("Mock CORE Token", "CORE", 18);

  await mockCore.waitForDeployment();
  const tokenAddress = await mockCore.getAddress();

  console.log(`✅ Mock CORE deployed at: ${tokenAddress}`);
  console.log("Add to your .env file:");
  console.log(`CORE_TESTNET2_CORE_TOKEN=${tokenAddress}`);

  // Mint initial supply
  const initialSupply = ethers.parseEther("1000000"); // 1M tokens
  await mockCore.mint(deployer.address, initialSupply);
  console.log(`✅ Minted ${ethers.formatEther(initialSupply)} CORE tokens`);

  return tokenAddress;
}

// Run deploy mock token if requested
if (process.env.DEPLOY_MOCK_CORE === "true") {
  deployMockCoreToken()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
} else {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
