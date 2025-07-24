import { ethers, network } from "hardhat";

const CONTRACTS = {
  VAULT: process.env.VAULT_ADDRESS || "",
  USDC: process.env.USDC_ADDRESS || "",
  WBTC: process.env.WBTC_ADDRESS || "",
  WETH: process.env.WETH_ADDRESS || "",
};

async function main() {
  if (!CONTRACTS.VAULT) {
    console.log("❌ VAULT_ADDRESS not set in .env file");
    return;
  }

  const [deployer] = await ethers.getSigners();
  console.log(`📊 Vault Status on ${network.name}`);
  console.log(`👤 Account: ${deployer.address}`);

  const vault = await ethers.getContractAt("MultiTokenVault", CONTRACTS.VAULT);

  // Vault info
  const totalAssets = await vault.totalAssets();
  const totalSupply = await vault.totalSupply();
  const userShares = await vault.balanceOf(deployer.address);

  console.log(`\n🏦 Vault: ${CONTRACTS.VAULT}`);
  console.log(`💰 Total Assets: ${ethers.formatUnits(totalAssets, 6)} USDC`);
  console.log(`📈 Total Shares: ${ethers.formatUnits(totalSupply, 6)}`);
  console.log(`👤 Your Shares: ${ethers.formatUnits(userShares, 6)}`);

  if (totalSupply > 0) {
    const exchangeRate = (totalAssets * 1000000n) / totalSupply;
    console.log(
      `💱 Exchange Rate: 1 share = ${ethers.formatUnits(exchangeRate, 6)} USDC`
    );
  }

  // Token balances
  if (CONTRACTS.USDC) {
    const usdc = await ethers.getContractAt("MockUSDC", CONTRACTS.USDC);
    const balance = await usdc.balanceOf(deployer.address);
    console.log(`💵 Your USDC: ${ethers.formatUnits(balance, 6)}`);
  }

  if (CONTRACTS.WBTC) {
    const wbtc = await ethers.getContractAt("MockWBTC", CONTRACTS.WBTC);
    const balance = await wbtc.balanceOf(deployer.address);
    console.log(`₿ Your WBTC: ${ethers.formatUnits(balance, 8)}`);
  }

  if (CONTRACTS.WETH) {
    const weth = await ethers.getContractAt("MockWETH", CONTRACTS.WETH);
    const balance = await weth.balanceOf(deployer.address);
    console.log(`⧫ Your WETH: ${ethers.formatUnits(balance, 18)}`);
  }

  // Accepted tokens
  console.log(`\n📋 Accepted Tokens:`);
  const acceptedTokens = await vault.getAcceptedTokens();
  for (const token of acceptedTokens) {
    const config = await vault.acceptedTokens(token);
    console.log(`  ${token} (${config.decimals} decimals)`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  });
