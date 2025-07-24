import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("MockProtocolModule", (m) => {
  // Parameters for token addresses
  const underlyingTokenAddress = m.getParameter("underlyingTokenAddress");
  const rewardTokenAddress = m.getParameter("rewardTokenAddress");

  // Deploy MockProtocol
  const mockProtocol = m.contract("MockProtocol", [underlyingTokenAddress, rewardTokenAddress]);

  return { mockProtocol };
}); 