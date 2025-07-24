import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// Chainlink Price Feed Addresses (network-specific, will be passed as parameters)
const CHAINLINK_FEEDS = {
  BTC_USD:
    process.env.BTC_USD_FEED || "0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43", // Default to Ethereum mainnet
  ETH_USD:
    process.env.ETH_USD_FEED || "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419", // Default to Ethereum mainnet
  USDC_USD:
    process.env.USDC_USD_FEED || "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6", // Default to Ethereum mainnet
};

const MultiTokenVaultSystem = buildModule("MultiTokenVaultSystem", (m) => {
  const deployer = m.getAccount(0);

  // Deploy Mock Tokens
  const mockUSDC = m.contract("MockUSDC", []);
  const mockWBTC = m.contract("MockWBTC", []);
  const mockWETH = m.contract("MockWETH", []);

  // Deploy MultiTokenVault
  const multiTokenVault = m.contract("MultiTokenVault", [
    mockUSDC, // USDC address (underlying asset)
    deployer, // Manager address (deployer)
    deployer, // Agent address (deployer)
    "Multi-Token Vault", // Vault name
    "mtvUSDC", // Vault symbol
  ]);

  // Configure tokens - Note: Price feeds will be configured via scripts using env vars
  m.call(
    multiTokenVault,
    "configureToken",
    [mockUSDC, "0x0000000000000000000000000000000000000000", 6],
    {
      id: "configure_usdc",
    }
  );

  return {
    mockUSDC,
    mockWBTC,
    mockWETH,
    multiTokenVault,
  };
});

export default MultiTokenVaultSystem;
