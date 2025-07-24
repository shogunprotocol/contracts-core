import { ethers, network } from "hardhat";

// Contract addresses from Fuji deployment
const FUJI_CONTRACTS = {
  USDC: "0xff861DC110F4F0b3bF0e1984c58dec2073B69D54",
  WBTC: "0xC1A288E35D27Ece799Dd37FEBDd2B6734C884058",
  WETH: "0x4b08Cc3Dd8c75965BE26A70721d1e6099404DCa8",
};

// Default mint amounts (respecting faucet limits)
const MINT_AMOUNTS = {
  USDC: ethers.parseUnits("10000", 6), // 10,000 USDC (max per faucet)
  WBTC: ethers.parseUnits("1", 8), // 1 WBTC (max per faucet)
  WETH: ethers.parseUnits("10", 18), // 10 WETH (max per faucet)
};

async function main() {
  if (network.name !== "fuji") {
    console.log("❌ This script is designed for Fuji testnet only");
    console.log("Run: npx hardhat run scripts/mint-tokens.ts --network fuji");
    return;
  }

  const [signer] = await ethers.getSigners();
  console.log("🪙 Minting Test Tokens on Fuji");
  console.log(`👤 Account: ${signer.address}`);

  // Check current balances
  console.log("\n💰 Current Balances:");

  const usdc = await ethers.getContractAt("MockUSDC", FUJI_CONTRACTS.USDC);
  const wbtc = await ethers.getContractAt("MockWBTC", FUJI_CONTRACTS.WBTC);
  const weth = await ethers.getContractAt("MockWETH", FUJI_CONTRACTS.WETH);

  const currentUSDC = await usdc.balanceOf(signer.address);
  const currentWBTC = await wbtc.balanceOf(signer.address);
  const currentWETH = await weth.balanceOf(signer.address);

  console.log(`  USDC: ${ethers.formatUnits(currentUSDC, 6)}`);
  console.log(`  WBTC: ${ethers.formatUnits(currentWBTC, 8)}`);
  console.log(`  WETH: ${ethers.formatUnits(currentWETH, 18)}`);

  // Mint tokens
  console.log("\n🚰 Minting Test Tokens:");

  try {
    console.log(
      `  Minting ${ethers.formatUnits(MINT_AMOUNTS.USDC, 6)} USDC...`
    );
    const usdcTx = await usdc.faucet(MINT_AMOUNTS.USDC);
    await usdcTx.wait();
    console.log(`  ✅ USDC minted successfully`);
  } catch (error: any) {
    console.log(`  ❌ USDC minting failed: ${error.message}`);
  }

  try {
    console.log(
      `  Minting ${ethers.formatUnits(MINT_AMOUNTS.WBTC, 8)} WBTC...`
    );
    const wbtcTx = await wbtc.faucet(MINT_AMOUNTS.WBTC);
    await wbtcTx.wait();
    console.log(`  ✅ WBTC minted successfully`);
  } catch (error: any) {
    console.log(`  ❌ WBTC minting failed: ${error.message}`);
  }

  try {
    console.log(
      `  Minting ${ethers.formatUnits(MINT_AMOUNTS.WETH, 18)} WETH...`
    );
    const wethTx = await weth.faucet(MINT_AMOUNTS.WETH);
    await wethTx.wait();
    console.log(`  ✅ WETH minted successfully`);
  } catch (error: any) {
    console.log(`  ❌ WETH minting failed: ${error.message}`);
  }

  // Check new balances
  console.log("\n💰 New Balances:");

  const newUSDC = await usdc.balanceOf(signer.address);
  const newWBTC = await wbtc.balanceOf(signer.address);
  const newWETH = await weth.balanceOf(signer.address);

  console.log(
    `  USDC: ${ethers.formatUnits(newUSDC, 6)} (+${ethers.formatUnits(
      newUSDC - currentUSDC,
      6
    )})`
  );
  console.log(
    `  WBTC: ${ethers.formatUnits(newWBTC, 8)} (+${ethers.formatUnits(
      newWBTC - currentWBTC,
      8
    )})`
  );
  console.log(
    `  WETH: ${ethers.formatUnits(newWETH, 18)} (+${ethers.formatUnits(
      newWETH - currentWETH,
      18
    )})`
  );

  // Show token addresses for reference
  console.log("\n📋 Token Addresses:");
  console.log(`  USDC: ${FUJI_CONTRACTS.USDC}`);
  console.log(`  WBTC: ${FUJI_CONTRACTS.WBTC}`);
  console.log(`  WETH: ${FUJI_CONTRACTS.WETH}`);

  // Show usage examples
  console.log("\n🎯 Ready for Testing:");
  console.log(`  • Test USDC deposits (works perfectly)`);
  console.log(`  • Test WETH multi-token deposits (works perfectly)`);
  console.log(
    `  • WBTC may fail due to stale price feeds (testnet limitation)`
  );

  console.log("\n✅ Token minting completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`❌ Token minting failed: ${error.message}`);
    process.exit(1);
  });
