import { ethers, network } from "hardhat";

const CONTRACTS = {
  USDC: process.env.USDC_ADDRESS || "",
  WBTC: process.env.WBTC_ADDRESS || "",
  WETH: process.env.WETH_ADDRESS || "",
};

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`🪙 Getting test tokens on ${network.name}`);
  console.log(`👤 Account: ${deployer.address}`);

  if (CONTRACTS.USDC) {
    try {
      const usdc = await ethers.getContractAt("MockUSDC", CONTRACTS.USDC);
      await usdc.faucet(ethers.parseUnits("10000", 6));
      console.log("✅ Got 10,000 USDC");
    } catch (error) {
      console.log("❌ Failed to get USDC");
    }
  }

  if (CONTRACTS.WBTC) {
    try {
      const wbtc = await ethers.getContractAt("MockWBTC", CONTRACTS.WBTC);
      await wbtc.faucet(ethers.parseUnits("1", 8));
      console.log("✅ Got 1 WBTC");
    } catch (error) {
      console.log("❌ Failed to get WBTC");
    }
  }

  if (CONTRACTS.WETH) {
    try {
      const weth = await ethers.getContractAt("MockWETH", CONTRACTS.WETH);
      await weth.faucet(ethers.parseUnits("10", 18));
      console.log("✅ Got 10 WETH");
    } catch (error) {
      console.log("❌ Failed to get WETH");
    }
  }

  if (!CONTRACTS.USDC && !CONTRACTS.WBTC && !CONTRACTS.WETH) {
    console.log("❌ No contract addresses set in .env file");
    console.log("Run deployment script first:");
    console.log(
      `npx hardhat run scripts/deployTokensAndVault.ts --network ${network.name}`
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  });
