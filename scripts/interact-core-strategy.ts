import { ethers, network } from "hardhat";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Contract addresses - update these from .env
const CORE_CONTRACTS = {
  CORE_STRATEGY:
    process.env.CORE_TESTNET2_CORE_STRATEGY ||
    process.env.CORE_MAINNET_CORE_STRATEGY ||
    "",
  CORE_TOKEN:
    process.env.CORE_TESTNET2_CORE_TOKEN ||
    process.env.CORE_MAINNET_CORE_TOKEN ||
    "",
  VAULT:
    process.env.CORE_TESTNET2_VAULT || process.env.CORE_MAINNET_VAULT || "",
};

// Test amounts
const TEST_AMOUNTS = {
  STAKE_AMOUNT: ethers.parseEther("100"), // 100 CORE tokens
  MIN_BALANCE: ethers.parseEther("10"), // Minimum balance needed
};

async function main() {
  if (!network.name.includes("core")) {
    console.log("❌ This script is designed for Core Chain networks only");
    console.log(
      "Run: npx hardhat run scripts/interact-core-strategy.ts --network core_testnet2"
    );
    return;
  }

  if (!CORE_CONTRACTS.CORE_STRATEGY || !CORE_CONTRACTS.CORE_TOKEN) {
    console.log("❌ Contract addresses not set. Check your .env file.");
    console.log("Required environment variables:");
    console.log(
      "  - CORE_TESTNET2_CORE_STRATEGY or CORE_MAINNET_CORE_STRATEGY"
    );
    console.log("  - CORE_TESTNET2_CORE_TOKEN or CORE_MAINNET_CORE_TOKEN");
    console.log("  - CORE_TESTNET2_VAULT or CORE_MAINNET_VAULT (optional)");
    console.log("\nRun deployment script first:");
    console.log(
      "  npx hardhat run scripts/deploy-core-strategy.ts --network",
      network.name
    );
    return;
  }

  const [user] = await ethers.getSigners();
  console.log(`🎮 Interacting with CoreStrategy on ${network.name}`);
  console.log(`👤 Account: ${user.address}`);

  // Connect to contracts
  const coreStrategy = await ethers.getContractAt(
    "CoreStrategy",
    CORE_CONTRACTS.CORE_STRATEGY
  );
  const coreToken = await ethers.getContractAt(
    "MockERC20",
    CORE_CONTRACTS.CORE_TOKEN
  );

  let vault: any = null;
  if (CORE_CONTRACTS.VAULT) {
    vault = await ethers.getContractAt("Vault", CORE_CONTRACTS.VAULT);
  }

  // Display current state
  console.log("\n📊 Current State:");

  // User balances
  const coreBalance = await coreToken.balanceOf(user.address);
  const nativeBalance = await ethers.provider.getBalance(user.address);

  console.log(`💰 CORE Balance: ${ethers.formatEther(coreBalance)} CORE`);
  console.log(`💰 Native Balance: ${ethers.formatEther(nativeBalance)} CORE`);

  if (vault) {
    const vaultShares = await vault.balanceOf(user.address);
    console.log(`💰 Vault Shares: ${ethers.formatEther(vaultShares)} vCORE`);
  }

  // Strategy state
  const strategyBalance = await coreStrategy.getBalance();
  const totalStaked = await coreStrategy.totalStaked();
  const defaultValidator = await coreStrategy.defaultValidator();
  const isPaused = await coreStrategy.paused();

  console.log(
    `🏗️ Strategy Balance: ${ethers.formatEther(strategyBalance)} CORE`
  );
  console.log(`📈 Total Staked: ${ethers.formatEther(totalStaked)} CORE`);
  console.log(`🏛️ Default Validator: ${defaultValidator}`);
  console.log(`⏸️ Paused: ${isPaused}`);

  // Check if we have enough CORE tokens
  if (coreBalance < TEST_AMOUNTS.MIN_BALANCE) {
    console.log("\n🪙 Insufficient CORE balance for testing.");

    // Try to mint if it's a mock token
    try {
      console.log("🚰 Attempting to mint test CORE tokens...");
      const mintTx = await coreToken.mint(
        user.address,
        TEST_AMOUNTS.STAKE_AMOUNT
      );
      await mintTx.wait();
      console.log(
        `✅ Minted ${ethers.formatEther(TEST_AMOUNTS.STAKE_AMOUNT)} CORE tokens`
      );
    } catch (error) {
      console.log("❌ Cannot mint tokens. This might be a real CORE token.");
      console.log("Get CORE tokens from a faucet or exchange.");
      return;
    }
  }

  // Interactive menu
  console.log("\n🎯 Available Actions:");
  console.log("1. Execute staking (delegate to validator)");
  console.log("2. Harvest rewards");
  console.log("3. Emergency exit");
  console.log("4. View delegator info");
  console.log("5. Calculate rewards");

  // For demo purposes, let's execute some actions
  const action = process.env.ACTION || "1";

  switch (action) {
    case "1":
      await executeStaking(coreStrategy, coreToken, vault, user);
      break;
    case "2":
      await harvestRewards(coreStrategy, vault, user);
      break;
    case "3":
      await emergencyExit(coreStrategy, vault, user);
      break;
    case "4":
      await viewDelegatorInfo(coreStrategy);
      break;
    case "5":
      await calculateRewards(coreStrategy, vault, user);
      break;
    default:
      console.log(
        "Invalid action. Set ACTION=1,2,3,4,5 in environment or .env"
      );
  }
}

async function executeStaking(
  coreStrategy: any,
  coreToken: any,
  vault: any,
  user: any
) {
  console.log("\n🚀 Executing Staking...");

  const stakeAmount = TEST_AMOUNTS.STAKE_AMOUNT;
  console.log(`💰 Staking amount: ${ethers.formatEther(stakeAmount)} CORE`);

  try {
    // If using vault
    if (vault) {
      console.log("🏦 Depositing to vault and executing strategy...");

      // Approve vault to spend CORE tokens
      console.log("✅ Approving vault...");
      const approveTx = await coreToken.approve(
        await vault.getAddress(),
        stakeAmount
      );
      await approveTx.wait();

      // Deposit to vault
      console.log("📥 Depositing to vault...");
      const depositTx = await vault.deposit(stakeAmount, user.address);
      await depositTx.wait();

      // Execute strategy through vault
      console.log("🎯 Executing strategy...");
      const executeTx = await vault.depositToStrategy(
        await coreStrategy.getAddress(),
        stakeAmount,
        "0x" // Use default validator
      );
      await executeTx.wait();
    } else {
      console.log("🎯 Direct strategy execution (vault not set)...");

      // Set user as vault for testing (normally not recommended)
      const vaultAddress = await coreStrategy.vault();
      if (vaultAddress === ethers.ZeroAddress) {
        console.log("⚠️ Setting user as vault for testing...");
        await coreStrategy.setVault(user.address);
      }

      // Approve strategy to spend CORE tokens
      console.log("✅ Approving strategy...");
      const approveTx = await coreToken.approve(
        await coreStrategy.getAddress(),
        stakeAmount
      );
      await approveTx.wait();

      // Execute staking
      console.log("🎯 Executing staking...");
      const executeTx = await coreStrategy.execute(stakeAmount, "0x");
      await executeTx.wait();
    }

    console.log("✅ Staking executed successfully!");

    // Show updated state
    const newBalance = await coreStrategy.getBalance();
    console.log(
      `📈 New strategy balance: ${ethers.formatEther(newBalance)} CORE`
    );
  } catch (error) {
    console.error("❌ Staking failed:", error);
  }
}

async function harvestRewards(coreStrategy: any, vault: any, user: any) {
  console.log("\n🌾 Harvesting Rewards...");

  try {
    const initialBalance = await ethers.provider.getBalance(user.address);

    if (vault) {
      console.log("🏦 Harvesting through vault...");
      const harvestTx = await vault.harvestStrategy(
        await coreStrategy.getAddress(),
        "0x"
      );
      await harvestTx.wait();
    } else {
      console.log("🎯 Direct harvest...");
      const harvestTx = await coreStrategy.harvest("0x");
      await harvestTx.wait();
    }

    const finalBalance = await ethers.provider.getBalance(user.address);
    const rewards = finalBalance - initialBalance;

    console.log(`✅ Rewards harvested: ${ethers.formatEther(rewards)} CORE`);
  } catch (error) {
    console.error("❌ Harvest failed:", error);
  }
}

async function emergencyExit(coreStrategy: any, vault: any, user: any) {
  console.log("\n🚨 Performing Emergency Exit...");

  try {
    if (vault) {
      console.log("🏦 Emergency exit through vault...");
      const exitTx = await vault.emergencyExitStrategy(
        await coreStrategy.getAddress(),
        "0x"
      );
      await exitTx.wait();
    } else {
      console.log("🎯 Direct emergency exit...");
      const exitTx = await coreStrategy.emergencyExit("0x");
      await exitTx.wait();
    }

    console.log("✅ Emergency exit completed!");

    // Show updated state
    const newBalance = await coreStrategy.getBalance();
    console.log(
      `📉 New strategy balance: ${ethers.formatEther(newBalance)} CORE`
    );
  } catch (error) {
    console.error("❌ Emergency exit failed:", error);
  }
}

async function viewDelegatorInfo(coreStrategy: any) {
  console.log("\n👤 Delegator Information...");

  try {
    const delegatorInfo = await coreStrategy.getDelegatorInfo();
    console.log(`🔄 Change Round: ${delegatorInfo.changeRound}`);
    console.log(
      `💰 Rewards: ${delegatorInfo.rewards
        .map((r: any) => ethers.formatEther(r))
        .join(", ")} CORE`
    );
  } catch (error) {
    console.error("❌ Failed to get delegator info:", error);
  }
}

async function calculateRewards(coreStrategy: any, vault: any, user: any) {
  console.log("\n🧮 Calculating Rewards...");

  try {
    if (vault) {
      console.log("🏦 Calculating through vault...");
      // Vault might not have direct calculateRewards method
      console.log("ℹ️ Use harvest to claim rewards through vault");
    } else {
      console.log("🎯 Direct calculation...");
      const calculateTx = await coreStrategy.calculateRewards();
      await calculateTx.wait();
      console.log("✅ Rewards calculated and updated");
    }
  } catch (error) {
    console.error("❌ Calculate rewards failed:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
