import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseEther } from "ethers";

export default buildModule("MockTokenModule", (m) => {
  // Parameters with defaults
  const name = m.getParameter("name", "Test Token");
  const symbol = m.getParameter("symbol", "TEST");

  // Deploy MockToken
  const mockToken = m.contract("MockToken", [name, symbol]);

  // Mint initial supply to deployer (1M tokens)
  m.call(mockToken, "mint", [m.getAccount(0), parseEther("1000000")], {
    id: "mintInitialSupply"
  });

  return { mockToken };
}); 