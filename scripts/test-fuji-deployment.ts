import { ethers, network } from "hardhat";

// Contract addresses from your Fuji deployment
const FUJI_CONTRACTS = {
  VAULT: "0xCf0830B6595904D85d36A4228841483737e80263",
  USDC: "0xff861DC110F4F0b3bF0e1984c58dec2073B69D54",
  WBTC: "0xC1A288E35D27Ece799Dd37FEBDd2B6734C884058",
  WETH: "0x4b08Cc3Dd8c75965BE26A70721d1e6099404DCa8",
};

async function main() {
  if (network.name !== "fuji") {
    console.log("❌ This script is designed for Fuji testnet");
    console.log(
      "Run: npx hardhat run scripts/test-fuji-deployment.ts --network fuji"
    );
    return;
  }

  const [deployer] = await ethers.getSigners();
  console.log(`🧪 Testing Fuji deployment`);
  console.log(`👤 Account: ${deployer.address}`);

  // Get contract instances
  const vault = await ethers.getContractAt(
    "MultiTokenVault",
    FUJI_CONTRACTS.VAULT
  );
  const usdc = await ethers.getContractAt("MockUSDC", FUJI_CONTRACTS.USDC);
  const wbtc = await ethers.getContractAt("MockWBTC", FUJI_CONTRACTS.WBTC);
  const weth = await ethers.getContractAt("MockWETH", FUJI_CONTRACTS.WETH);

  console.log(`\n📋 Contract Addresses:`);
  console.log(`  Vault: ${FUJI_CONTRACTS.VAULT}`);
  console.log(`  USDC: ${FUJI_CONTRACTS.USDC}`);
  console.log(`  WBTC: ${FUJI_CONTRACTS.WBTC}`);
  console.log(`  WETH: ${FUJI_CONTRACTS.WETH}`);

  // Check initial balances
  console.log(`\n💰 Initial Balances:`);
  const initialUsdcBalance = await usdc.balanceOf(deployer.address);
  const initialWbtcBalance = await wbtc.balanceOf(deployer.address);
  const initialWethBalance = await weth.balanceOf(deployer.address);
  const initialVaultShares = await vault.balanceOf(deployer.address);

  console.log(`  USDC: ${ethers.formatUnits(initialUsdcBalance, 6)}`);
  console.log(`  WBTC: ${ethers.formatUnits(initialWbtcBalance, 8)}`);
  console.log(`  WETH: ${ethers.formatUnits(initialWethBalance, 18)}`);
  console.log(`  Vault Shares: ${ethers.formatUnits(initialVaultShares, 6)}`);

  // Get test tokens if needed
  console.log(`\n🚰 Getting test tokens...`);
  if (initialUsdcBalance < ethers.parseUnits("1000", 6)) {
    await usdc.faucet(ethers.parseUnits("10000", 6));
    console.log(`✅ Got 10,000 USDC`);
  }
  if (initialWbtcBalance < ethers.parseUnits("0.1", 8)) {
    await wbtc.faucet(ethers.parseUnits("1", 8));
    console.log(`✅ Got 1 WBTC`);
  }
  if (initialWethBalance < ethers.parseUnits("1", 18)) {
    await weth.faucet(ethers.parseUnits("10", 18));
    console.log(`✅ Got 10 WETH`);
  }

  // Test price feeds
  console.log(`\n🔮 Testing Price Feeds:`);

  try {
    const usdcPreview = await vault.previewTokenDeposit(
      FUJI_CONTRACTS.USDC,
      ethers.parseUnits("1000", 6)
    );
    console.log(
      `  ✅ USDC: 1000 USDC = ${ethers.formatUnits(
        usdcPreview,
        6
      )} USDC equivalent`
    );
  } catch (error) {
    console.log(`  ❌ USDC price feed failed: ${error}`);
  }

  try {
    const wbtcPreview = await vault.previewTokenDeposit(
      FUJI_CONTRACTS.WBTC,
      ethers.parseUnits("0.01", 8)
    );
    console.log(
      `  ✅ WBTC: 0.01 WBTC = ${ethers.formatUnits(
        wbtcPreview,
        6
      )} USDC equivalent`
    );
  } catch (error) {
    console.log(`  ❌ WBTC price feed failed: ${error}`);
  }

  try {
    const wethPreview = await vault.previewTokenDeposit(
      FUJI_CONTRACTS.WETH,
      ethers.parseUnits("0.1", 18)
    );
    console.log(
      `  ✅ WETH: 0.1 WETH = ${ethers.formatUnits(
        wethPreview,
        6
      )} USDC equivalent`
    );
  } catch (error) {
    console.log(`  ❌ WETH price feed failed: ${error}`);
  }

  // Test USDC deposit
  console.log(`\n💵 Testing USDC Deposit:`);
  const depositAmount = ethers.parseUnits("1000", 6);

  console.log(`  Approving ${ethers.formatUnits(depositAmount, 6)} USDC...`);
  await usdc.approve(FUJI_CONTRACTS.VAULT, depositAmount);

  console.log(`  Depositing ${ethers.formatUnits(depositAmount, 6)} USDC...`);
  const depositTx = await vault.deposit(depositAmount, deployer.address);
  await depositTx.wait();

  const newVaultShares = await vault.balanceOf(deployer.address);
  const sharesGained = newVaultShares - initialVaultShares;
  console.log(`  ✅ Deposit successful!`);
  console.log(`  📈 Shares gained: ${ethers.formatUnits(sharesGained, 6)}`);

  // Test multi-token deposit with WBTC
  console.log(`\n₿ Testing WBTC Multi-Token Deposit:`);
  const wbtcAmount = ethers.parseUnits("0.01", 8);

  try {
    console.log(`  Approving ${ethers.formatUnits(wbtcAmount, 8)} WBTC...`);
    await wbtc.approve(FUJI_CONTRACTS.VAULT, wbtcAmount);

    console.log(`  Depositing ${ethers.formatUnits(wbtcAmount, 8)} WBTC...`);
    const wbtcDepositTx = await vault.depositToken(
      FUJI_CONTRACTS.WBTC,
      wbtcAmount,
      deployer.address
    );
    await wbtcDepositTx.wait();

    const finalVaultShares = await vault.balanceOf(deployer.address);
    const wbtcSharesGained = finalVaultShares - newVaultShares;
    console.log(`  ✅ WBTC deposit successful!`);
    console.log(
      `  📈 Additional shares: ${ethers.formatUnits(wbtcSharesGained, 6)}`
    );
  } catch (error) {
    console.log(`  ❌ WBTC deposit failed: ${error}`);
  }

  // Test multi-token deposit with WETH
  console.log(`\n⧫ Testing WETH Multi-Token Deposit:`);
  const wethAmount = ethers.parseUnits("0.1", 18);

  try {
    console.log(`  Approving ${ethers.formatUnits(wethAmount, 18)} WETH...`);
    await weth.approve(FUJI_CONTRACTS.VAULT, wethAmount);

    console.log(`  Depositing ${ethers.formatUnits(wethAmount, 18)} WETH...`);
    const wethDepositTx = await vault.depositToken(
      FUJI_CONTRACTS.WETH,
      wethAmount,
      deployer.address
    );
    await wethDepositTx.wait();

    const finalVaultShares = await vault.balanceOf(deployer.address);
    console.log(`  ✅ WETH deposit successful!`);
  } catch (error) {
    console.log(`  ❌ WETH deposit failed: ${error}`);
  }

  // Final status
  console.log(`\n📊 Final Status:`);
  const finalUsdcBalance = await usdc.balanceOf(deployer.address);
  const finalWbtcBalance = await wbtc.balanceOf(deployer.address);
  const finalWethBalance = await weth.balanceOf(deployer.address);
  const finalVaultShares = await vault.balanceOf(deployer.address);
  const totalAssets = await vault.totalAssets();
  const totalSupply = await vault.totalSupply();

  console.log(`  Your USDC: ${ethers.formatUnits(finalUsdcBalance, 6)}`);
  console.log(`  Your WBTC: ${ethers.formatUnits(finalWbtcBalance, 8)}`);
  console.log(`  Your WETH: ${ethers.formatUnits(finalWethBalance, 18)}`);
  console.log(
    `  Your Vault Shares: ${ethers.formatUnits(finalVaultShares, 6)}`
  );
  console.log(
    `  Vault Total Assets: ${ethers.formatUnits(totalAssets, 6)} USDC`
  );
  console.log(
    `  Vault Total Supply: ${ethers.formatUnits(totalSupply, 6)} shares`
  );

  if (totalSupply > 0) {
    const exchangeRate = (totalAssets * 1000000n) / totalSupply;
    console.log(
      `  💱 Exchange Rate: 1 share = ${ethers.formatUnits(
        exchangeRate,
        6
      )} USDC`
    );
  }

  console.log(`\n✅ Testing completed successfully!`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`❌ Testing failed: ${error.message}`);
    process.exit(1);
  });
