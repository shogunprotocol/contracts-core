# AI Vaults - Modular Smart Contract System

A modular and extensible vault system built on Ethereum with ERC4626 compliance, featuring compound interest, strategy management, and role-based access control.

## 🏗️ Architecture Overview

The system has been refactored into a modular architecture for better maintainability, reusability, and separation of concerns:

### Core Modules

#### 📚 Libraries

- **`YieldMath.sol`** - Mathematical library for yield calculations
  - Compound interest computation with Taylor series approximation
  - Linear yield calculations for short periods
  - Validation functions for rates and fees
  - Gas-optimized calculations

#### 🏛️ Base Contracts

- **`VaultAccessControl.sol`** - Role-based access control

  - Manager, Agent, and Pauser roles
  - Role validation and management
  - Access control modifiers

- **`VaultCore.sol`** - Core vault functionality

  - Strategy management (add/remove/execute)
  - Strategy lifecycle operations
  - Abstract contract for inheritance

- **`VaultFees.sol`** - Fee management system
  - Withdrawal fee calculation and collection
  - Treasury management
  - Fee validation and limits

#### 🏦 Main Contracts

- **`Vault.sol`** - Complete vault implementation

  - ERC4626 compliance
  - Yield accrual and compounding
  - Strategy integration
  - Fee management
  - Pausable functionality

- **`VaultFactory.sol`** - Factory for vault creation

  - Standardized vault deployment
  - Fee collection for vault creation
  - Default parameter management

- **`strategies.sol`** - Generic strategy implementation
  - Protocol-agnostic strategy execution via function selectors
  - Automatic reward token collection and forwarding
  - Emergency exit functionality
  - Pausable strategy operations

## 🚀 Key Features

### 🔐 Access Control

- **Manager Role**: Can add/remove strategies, change yield rates, collect fees
- **Agent Role**: Can execute strategies, harvest rewards, perform emergency exits
- **Pauser Role**: Can pause/unpause vault operations
- **Owner**: Full administrative control

### 💰 Yield System

- **Compound Interest**: Efficient Taylor series approximation for long periods
- **Linear Approximation**: Gas-optimized for short periods (< 7 days)
- **Configurable Rates**: Up to 20% annual yield rate
- **Real-time Accrual**: Yield updates on deposits/withdrawals

### 🎯 Strategy Management

- **Generic Implementation**: Works with any protocol via function selectors
- **Multiple Strategies**: Support for multiple concurrent strategies
- **Reward Handling**: Automatic forwarding of reward tokens
- **Emergency Exit**: Quick withdrawal from strategies

### 💸 Fee System

- **Withdrawal Fees**: Configurable up to 10%
- **Treasury Management**: Dedicated fee collection address
- **Fee Validation**: Built-in limits and validation

## 📁 Project Structure

```
contracts/
├── base/                    # Base modular contracts (inherited by Vault.sol)
│   ├── VaultAccessControl.sol (91 lines)
│   ├── VaultCore.sol (196 lines)
│   └── VaultFees.sol (150 lines)
├── libraries/               # Reusable libraries
│   └── YieldMath.sol (168 lines)
├── interfaces/              # Contract interfaces
│   ├── Strategies.sol (157 lines)
│   ├── IVaultFactory.sol (193 lines)
│   └── Vault.sol (142 lines)
├── strategies/              # Strategy implementations
│   └── strategies.sol (370 lines)
├── mocks/                   # Mock contracts for testing
│   ├── MockERC20.sol (24 lines)
│   ├── MockProtocol.sol (94 lines)
│   ├── MockSushiSwap.sol (269 lines)
│   ├── MockToken.sol (40 lines)
│   ├── MockUniswapV3.sol (339 lines)
│   └── MockUSDC.sol (44 lines)
├── Vault.sol (464 lines)    # Main vault contract
└── VaultFactory.sol (463 lines) # Factory contract
```

**Note**: The main `Vault.sol` contract uses true modular inheritance, inheriting from `VaultAccessControl`, `VaultCore`, and `VaultFees` base contracts while leveraging the `YieldMath` library for mathematical operations.

## 🧪 Testing

The modular architecture is thoroughly tested with comprehensive test suites:

- **184 passing tests** covering all functionality
- **Unit tests** for each module
- **Integration tests** for complete workflows
- **Edge case testing** for security and robustness
- **Gas optimization tests** for efficiency

### Test Categories

- Constructor and role validation
- Strategy management operations
- ERC4626 compliance
- Yield calculation accuracy
- Fee collection and management
- Access control security
- Emergency scenarios

## 🔧 Usage

### Deploying a Vault

```solidity
// Deploy vault with custom parameters
Vault vault = new Vault(
    underlyingToken,    // ERC20 token address
    "Vault Token",      // Token name
    "vUNDER",          // Token symbol
    manager,           // Manager address
    agent,             // Agent address
    100,               // 1% withdrawal fee (100 basis points)
    500,               // 5% annual yield rate (500 basis points)
    treasury           // Treasury address
);
```

### Using the Factory

```solidity
// Deploy factory
VaultFactory factory = new VaultFactory(
    defaultManager,
    defaultAgent,
    defaultWithdrawalFee,
    creationFee,
    treasury
);

// Create vault through factory
factory.createVault(
    underlyingToken,
    "Vault Token",
    "vUNDER",
    customManager,     // Optional: use custom manager
    customAgent,       // Optional: use custom agent
    withdrawalFee,
    yieldRate,
    { value: creationFee }
);
```

### Strategy Integration

```solidity
// Add strategy to vault
vault.addStrategy(strategyAddress);

// Execute strategy
vault.depositToStrategy(strategyAddress, amount, data);

// Harvest rewards
vault.harvestStrategy(strategyAddress, data);

// Emergency exit
vault.emergencyExitStrategy(strategyAddress, data);
```

## 🔒 Security Features

- **Reentrancy Protection**: All external calls protected
- **Access Control**: Role-based permissions
- **Pausable**: Emergency pause functionality
- **Fee Limits**: Maximum withdrawal fee of 10%
- **Yield Limits**: Maximum yield rate of 20%
- **Safe Math**: Built-in overflow protection
- **Input Validation**: Comprehensive parameter validation
- **Custom Errors**: Gas-efficient error handling with clear messages

## 📊 Gas Optimization

- **Efficient Yield Calculation**: Hybrid linear/compound approach
- **EnumerableSet**: O(1) strategy operations
- **Minimal Storage**: Optimized state variable layout
- **Batch Operations**: Efficient multi-strategy management
- **Library Usage**: Reusable mathematical functions

## 🛠️ Development

### Prerequisites

- Node.js 16+
- Hardhat
- Solidity 0.8.13+

### Setup

```bash
npm install
npx hardhat compile
npx hardhat test
```

### Scripts

```bash
# Deploy to testnet
npm run deploy:fuji

# Run tests
npm run test

# Compile contracts
npm run compile
```

## 📈 Performance

- **Gas Efficient**: Optimized for cost-effective operations
- **Scalable**: Modular design supports easy extensions
- **Maintainable**: Clear separation of concerns
- **Upgradeable**: Modular architecture enables future upgrades

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Links

- [OpenZeppelin Contracts](https://openzeppelin.com/contracts/)
- [ERC4626 Standard](https://eips.ethereum.org/EIPS/eip-4626)
- [Hardhat Framework](https://hardhat.org/)
# contracts-core
# contracts-core
# contracts-core
# contracts-core
