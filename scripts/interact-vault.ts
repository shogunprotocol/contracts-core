import { ethers, network } from "hardhat";

// Simple contract addresses - update these after deployment
const CONTRACTS = {
  // Update these addresses after running deploy script
  VAULT: process.env.VAULT_ADDRESS || "",
  USDC: process.env.USDC_ADDRESS || "",
  WBTC: process.env.WBTC_ADDRESS || "",
  WETH: process.env.WETH_ADDRESS || "",
};

async function main() {
  if (!CONTRACTS.VAULT || !CONTRACTS.USDC) {
    console.log("❌ Contract addresses not set. Update .env file first.");
    console.log(
      "Run: npx hardhat run scripts/deployTokensAndVault.ts --network",
      network.name
    );
    return;
  }

  const [deployer] = await ethers.getSigners();
  console.log(`🎮 Interacting with vault on ${network.name}`);
  console.log(`👤 Account: ${deployer.address}`);

  const vault = await ethers.getContractAt("MultiTokenVault", CONTRACTS.VAULT);
  const usdc = await ethers.getContractAt("MockUSDC", CONTRACTS.USDC);

  // Show balances
  const usdcBalance = await usdc.balanceOf(deployer.address);
  const vaultShares = await vault.balanceOf(deployer.address);

  console.log(`💰 USDC: ${ethers.formatUnits(usdcBalance, 6)}`);
  console.log(`💰 Vault Shares: ${ethers.formatUnits(vaultShares, 6)}`);

  // Test faucet if low balance
  if (usdcBalance < ethers.parseUnits("1000", 6)) {
    console.log("Getting test tokens...");
    await usdc.faucet(ethers.parseUnits("10000", 6));
  }

  // Test deposit
  const depositAmount = ethers.parseUnits("1000", 6);
  console.log(`Depositing ${ethers.formatUnits(depositAmount, 6)} USDC...`);

  await usdc.approve(CONTRACTS.VAULT, depositAmount);
  await vault.deposit(depositAmount, deployer.address);

  const newShares = await vault.balanceOf(deployer.address);
  console.log(`✅ New vault shares: ${ethers.formatUnits(newShares, 6)}`);

  // Test multi-token deposit (if WBTC available)
  if (CONTRACTS.WBTC) {
    try {
      const wbtc = await ethers.getContractAt("MockWBTC", CONTRACTS.WBTC);
      const wbtcBalance = await wbtc.balanceOf(deployer.address);

      if (wbtcBalance === 0n) {
        await wbtc.faucet(ethers.parseUnits("1", 8));
      }

      const wbtcAmount = ethers.parseUnits("0.01", 8);
      console.log(`Depositing ${ethers.formatUnits(wbtcAmount, 8)} WBTC...`);

      await wbtc.approve(CONTRACTS.VAULT, wbtcAmount);
      await vault.depositToken(CONTRACTS.WBTC, wbtcAmount, deployer.address);

      const finalShares = await vault.balanceOf(deployer.address);
      console.log(
        `✅ Final vault shares: ${ethers.formatUnits(finalShares, 6)}`
      );
    } catch (error) {
      console.log(`❌ WBTC deposit failed: ${error}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  });
