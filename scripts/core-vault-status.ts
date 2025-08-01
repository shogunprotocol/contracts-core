import { ethers, network } from "hardhat";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Core Chain contract addresses
const CORE_CONTRACTS = {
  VAULT:
    process.env.CORE_TESTNET2_VAULT || process.env.CORE_MAINNET_VAULT || "",
  CORE_TOKEN:
    process.env.CORE_TESTNET2_CORE_TOKEN ||
    process.env.CORE_MAINNET_CORE_TOKEN ||
    "",
  CORE_STRATEGY:
    process.env.CORE_TESTNET2_CORE_STRATEGY ||
    process.env.CORE_MAINNET_CORE_STRATEGY ||
    "",
};

async function main() {
  if (!network.name.includes("core")) {
    console.log("❌ This script is designed for Core Chain networks only");
    console.log(
      "Run: npx hardhat run scripts/core-vault-status.ts --network core_testnet2"
    );
    return;
  }

  if (!CORE_CONTRACTS.VAULT && !CORE_CONTRACTS.CORE_STRATEGY) {
    console.log("❌ No contract addresses set. Check your .env file.");
    console.log("Required: VAULT or CORE_STRATEGY address");
    console.log("Run deployment script first:");
    console.log(
      `  npx hardhat run scripts/deploy-core-strategy.ts --network ${network.name}`
    );
    return;
  }

  const [user] = await ethers.getSigners();
  console.log(`📊 Core Chain Status on ${network.name}`);
  console.log(`👤 Account: ${user.address}`);

  // Native CORE balance
  const nativeBalance = await ethers.provider.getBalance(user.address);
  console.log(
    `💰 Native CORE Balance: ${ethers.formatEther(nativeBalance)} CORE`
  );

  // CORE Token status (if available)
  if (CORE_CONTRACTS.CORE_TOKEN) {
    console.log(`\n🪙 CORE Token: ${CORE_CONTRACTS.CORE_TOKEN}`);

    try {
      const coreToken = await ethers.getContractAt(
        "MockERC20",
        CORE_CONTRACTS.CORE_TOKEN
      );
      const tokenBalance = await coreToken.balanceOf(user.address);
      const tokenSymbol = await coreToken.symbol();
      const tokenName = await coreToken.name();
      const tokenDecimals = await coreToken.decimals();

      console.log(`📝 Token Name: ${tokenName}`);
      console.log(`🏷️ Token Symbol: ${tokenSymbol}`);
      console.log(`🔢 Decimals: ${tokenDecimals}`);
      console.log(
        `💰 Your Balance: ${ethers.formatEther(tokenBalance)} ${tokenSymbol}`
      );
    } catch (error) {
      console.log("⚠️ Could not connect to CORE token contract");
    }
  }

  // Vault status (if available)
  if (CORE_CONTRACTS.VAULT) {
    console.log(`\n🏦 Vault: ${CORE_CONTRACTS.VAULT}`);

    try {
      const vault = await ethers.getContractAt("Vault", CORE_CONTRACTS.VAULT);

      // Vault info
      const totalAssets = await vault.totalAssets();
      const totalSupply = await vault.totalSupply();
      const userShares = await vault.balanceOf(user.address);
      const vaultName = await vault.name();
      const vaultSymbol = await vault.symbol();

      console.log(`📝 Vault Name: ${vaultName}`);
      console.log(`🏷️ Vault Symbol: ${vaultSymbol}`);
      console.log(`💰 Total Assets: ${ethers.formatEther(totalAssets)} CORE`);
      console.log(
        `📈 Total Shares: ${ethers.formatEther(totalSupply)} ${vaultSymbol}`
      );
      console.log(
        `👤 Your Shares: ${ethers.formatEther(userShares)} ${vaultSymbol}`
      );

      // Exchange rate
      if (totalSupply > 0n) {
        const exchangeRate =
          (totalAssets * ethers.parseEther("1")) / totalSupply;
        console.log(
          `💱 Exchange Rate: 1 ${vaultSymbol} = ${ethers.formatEther(
            exchangeRate
          )} CORE`
        );

        // User's asset value
        if (userShares > 0n) {
          const userAssetValue = (userShares * totalAssets) / totalSupply;
          console.log(
            `💵 Your Asset Value: ${ethers.formatEther(userAssetValue)} CORE`
          );
        }
      }

      // Vault settings
      try {
        const withdrawalFee = await vault.withdrawalFee();
        const yieldRate = await vault.yieldRate();
        const treasury = await vault.treasury();
        const paused = await vault.paused();

        console.log(`\n⚙️ Vault Settings:`);
        console.log(`  💸 Withdrawal Fee: ${withdrawalFee / 100n}%`);
        console.log(`  📈 Yield Rate: ${yieldRate / 100n}%`);
        console.log(`  🏛️ Treasury: ${treasury}`);
        console.log(`  ⏸️ Paused: ${paused}`);
      } catch (error) {
        console.log(
          "⚠️ Could not fetch vault settings (might be simplified vault)"
        );
      }

      // Strategies
      try {
        console.log(`\n🎯 Vault Strategies:`);
        // Note: This would require iterating through strategies if the vault has that functionality
        if (CORE_CONTRACTS.CORE_STRATEGY) {
          console.log(`  📋 Core Strategy: ${CORE_CONTRACTS.CORE_STRATEGY}`);
        }
      } catch (error) {
        console.log("⚠️ Could not fetch strategies");
      }
    } catch (error) {
      console.log("⚠️ Could not connect to vault contract");
      console.log(`Error: ${error}`);
    }
  }

  // CoreStrategy status (if available)
  if (CORE_CONTRACTS.CORE_STRATEGY) {
    console.log(`\n🎯 CoreStrategy: ${CORE_CONTRACTS.CORE_STRATEGY}`);

    try {
      const coreStrategy = await ethers.getContractAt(
        "CoreStrategy",
        CORE_CONTRACTS.CORE_STRATEGY
      );

      // Strategy info
      const underlyingToken = await coreStrategy.underlyingToken();
      const stakeHub = await coreStrategy.stakeHub();
      const coreAgent = await coreStrategy.coreAgent();
      const defaultValidator = await coreStrategy.defaultValidator();
      const vault = await coreStrategy.vault();
      const paused = await coreStrategy.paused();
      const totalStaked = await coreStrategy.totalStaked();
      const balance = await coreStrategy.getBalance();

      console.log(`📝 Strategy Configuration:`);
      console.log(`  🪙 Underlying Token: ${underlyingToken}`);
      console.log(`  🏛️ StakeHub: ${stakeHub}`);
      console.log(`  🤖 Core Agent: ${coreAgent}`);
      console.log(`  👥 Default Validator: ${defaultValidator}`);
      console.log(
        `  🏦 Vault: ${vault === ethers.ZeroAddress ? "Not set" : vault}`
      );
      console.log(`  ⏸️ Paused: ${paused}`);

      console.log(`\n📊 Strategy Stats:`);
      console.log(`  📈 Total Staked: ${ethers.formatEther(totalStaked)} CORE`);
      console.log(`  💰 Strategy Balance: ${ethers.formatEther(balance)} CORE`);

      // Delegator info
      try {
        const delegatorInfo = await coreStrategy.getDelegatorInfo();
        console.log(`\n👤 Delegator Information:`);
        console.log(`  🔄 Change Round: ${delegatorInfo.changeRound}`);
        if (delegatorInfo.rewards.length > 0) {
          const rewardsStr = delegatorInfo.rewards
            .map((r: any) => ethers.formatEther(r))
            .join(", ");
          console.log(`  💰 Pending Rewards: ${rewardsStr} CORE`);
        }
      } catch (error) {
        console.log("⚠️ Could not fetch delegator info");
      }
    } catch (error) {
      console.log("⚠️ Could not connect to CoreStrategy contract");
      console.log(`Error: ${error}`);
    }
  }

  // Network information
  console.log(`\n🌐 Network Information:`);
  console.log(`  📡 Network: ${network.name}`);
  console.log(`  🆔 Chain ID: ${(await ethers.provider.getNetwork()).chainId}`);

  try {
    const block = await ethers.provider.getBlock("latest");
    console.log(`  📦 Latest Block: ${block?.number}`);
    console.log(
      `  ⏰ Block Time: ${new Date(
        (block?.timestamp || 0) * 1000
      ).toLocaleString()}`
    );

    // Gas price
    const gasPrice = await ethers.provider.getFeeData();
    if (gasPrice.gasPrice) {
      console.log(
        `  ⛽ Gas Price: ${ethers.formatUnits(gasPrice.gasPrice, "gwei")} gwei`
      );
    }
  } catch (error) {
    console.log("⚠️ Could not fetch network info");
  }

  console.log(`\n✅ Status check completed!`);

  // Suggestions based on current state
  console.log(`\n💡 Available Actions:`);
  if (!CORE_CONTRACTS.CORE_STRATEGY) {
    console.log(
      `  1. Deploy CoreStrategy: npm run deploy:core-${
        network.name.includes("testnet") ? "testnet" : "mainnet"
      }`
    );
  }
  if (CORE_CONTRACTS.CORE_TOKEN && nativeBalance > ethers.parseEther("0.1")) {
    console.log(
      `  2. Get CORE tokens: npm run tokens:core-${
        network.name.includes("testnet") ? "testnet" : "mainnet"
      }`
    );
  }
  if (CORE_CONTRACTS.CORE_STRATEGY) {
    console.log(
      `  3. Interact with strategy: npm run interact:core-${
        network.name.includes("testnet") ? "testnet" : "mainnet"
      }`
    );
  }
  console.log(`  4. Run tests: npm run test:core`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
