import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("VaultModule", (m) => {
  // Parameters
  const assetAddress = m.getParameter("assetAddress");
  const vaultName = m.getParameter("vaultName", "DeFi Vault");
  const vaultSymbol = m.getParameter("vaultSymbol", "vDEFI");
  const managerAddress = m.getParameter("managerAddress");
  const agentAddress = m.getParameter("agentAddress");

  // Deploy Vault
  const vault = m.contract("Vault", [
    assetAddress,
    vaultName,
    vaultSymbol,
    managerAddress,
    agentAddress
  ]);

  return { vault };
}); 