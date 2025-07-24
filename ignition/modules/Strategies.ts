import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { id } from "ethers";

export default buildModule("StrategiesModule", (m) => {
  // Parameters
  const underlyingTokenAddress = m.getParameter("underlyingTokenAddress");
  const protocolAddress = m.getParameter("protocolAddress");
  const depositSelector = m.getParameter("depositSelector", id("deposit(uint256)").slice(0, 10));
  const withdrawSelector = m.getParameter("withdrawSelector", id("withdraw(uint256)").slice(0, 10));
  const claimSelector = m.getParameter("claimSelector", id("claimRewards()").slice(0, 10));
  const getBalanceSelector = m.getParameter("getBalanceSelector", id("getBalance(address)").slice(0, 10));

  // Deploy Strategies
  const strategies = m.contract("Strategies", [
    underlyingTokenAddress,
    protocolAddress,
    depositSelector,
    withdrawSelector,
    claimSelector,
    getBalanceSelector
  ]);

  return { strategies };
}); 