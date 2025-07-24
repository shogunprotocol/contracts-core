import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseEther, id } from "ethers";

export default buildModule("VaultSystemModule", (m) => {
  // Get accounts
  const deployer = m.getAccount(0);
  const manager = m.getAccount(1);
  const agent = m.getAccount(2);

  // Deploy underlying token
  const underlyingToken = m.contract("MockToken", ["Underlying Token", "UNDER"], {
    id: "UnderlyingToken"
  });
  m.call(underlyingToken, "mint", [deployer, parseEther("1000000")], {
    id: "mintUnderlyingTokens"
  });

  // Deploy reward token  
  const rewardToken = m.contract("MockToken", ["Reward Token", "REWARD"], {
    id: "RewardToken"
  });
  m.call(rewardToken, "mint", [deployer, parseEther("1000000")], {
    id: "mintRewardTokens"
  });

  // Deploy mock protocol
  const mockProtocol = m.contract("MockProtocol", [underlyingToken, rewardToken], {
    id: "MockProtocol"
  });

  // Deploy vault
  const vault = m.contract("Vault", [
    underlyingToken,
    "DeFi Vault Token",
    "vDEFI", 
    manager,
    agent
  ], {
    id: "Vault"
  });

  // Deploy strategy
  const strategies = m.contract("Strategies", [
    underlyingToken,
    mockProtocol,
    id("deposit(uint256)").slice(0, 10),
    id("withdraw(uint256)").slice(0, 10),
    id("claimRewards()").slice(0, 10),
    id("getBalance(address)").slice(0, 10)
  ], {
    id: "Strategies"
  });

  // Set vault in strategy
  m.call(strategies, "setVault", [vault], {
    id: "setVaultInStrategy"
  });

  // Add strategy to vault
  m.call(vault, "addStrategy", [strategies], {
    id: "addStrategyToVault",
    from: manager
  });

  // Transfer reward tokens to protocol
  m.call(rewardToken, "transfer", [mockProtocol, parseEther("10000")], {
    id: "fundProtocolWithRewards"
  });

  return {
    underlyingToken,
    rewardToken,
    mockProtocol,
    vault,
    strategies
  };
}); 