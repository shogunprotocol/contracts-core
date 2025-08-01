# CORE Vaults - Modular Smart Contract System

A modular and extensible vault system built on Core Chain with ERC4626 compliance, featuring compound interest, strategy management, and role-based access control. Supports staking for CORE tokens, BTC (self-custodial), and stCORE (liquid staking).

## 🌐 Core Chain Integration

### Supported Assets

- **stCORE Token**: Staked CORE tokens (liquid staking of CORE) - ✅ **ACTIVE**
- **BTC (Self-Custodial)**: Bitcoin staking through Core Chain's hybrid consensus - 🔄 **PLANNED**
- **Native CORE**: Direct CORE token staking - 🔄 **PLANNED**

### Core Chain Components

- **StakeHub**: Central hub for managing all staking operations
- **CoreAgent**: Handles CORE token delegation and rewards
- **Validators**: Network validators for delegation and consensus

### Current Implementation

- ✅ **CoreStrategy**: Complete stCORE token staking implementation
- 🔄 **BTCStrategy**: Planned for Bitcoin staking
- 🔄 **NativeCoreStrategy**: Planned for native CORE staking

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

  - ERC4626 compliance for CORE tokens
  - Yield accrual and compounding
  - Strategy integration for Core Chain protocols
  - Fee management
  - Pausable functionality

- **`VaultFactory.sol`** - Factory for vault creation

  - Standardized vault deployment on Core Chain
  - Fee collection for vault creation
  - Default parameter management

- **`strategies/`** - Core Chain strategy implementations
  - **`CoreStrategy.sol`** - CORE token staking strategy
  - **`strategies.sol`** - Generic strategy base implementation
  - Core Chain StakeHub integration
  - Validator delegation support
  - Automatic reward collection and forwarding
  - Emergency exit functionality

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

- **Core Chain Integration**: Native integration with Core Chain's StakeHub
- **CORE Token Staking**: Direct delegation to Core Chain validators
- **Multiple Asset Support**: Ready for CORE, BTC, and stCORE strategies
- **Reward Handling**: Automatic collection of staking rewards
- **Emergency Exit**: Quick withdrawal from validators and protocols

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
├── strategies/              # Core Chain strategy implementations
│   ├── CoreStrategy.sol (292 lines) # CORE token staking strategy
│   └── strategies.sol (351 lines)   # Generic strategy base
├── mocks/                   # Mock contracts for testing
│   ├── MockERC20.sol (25 lines)     # Mock CORE token
│   ├── MockStakeHub.sol (153 lines) # Mock Core Chain StakeHub
│   ├── MockCoreAgent.sol (248 lines) # Mock Core Agent
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

- **25+ passing tests** for CoreStrategy covering all functionality
- **184 passing tests** for base vault system
- **Unit tests** for each module and Core Chain integration
- **Integration tests** for complete staking workflows
- **Mock Core Chain contracts** for realistic testing
- **Edge case testing** for security and robustness

### Test Categories

- Constructor and role validation
- Core Chain staking operations
- CORE token delegation to validators
- Staking reward collection and distribution
- ERC4626 compliance for CORE tokens
- Yield calculation accuracy
- Fee collection and management
- Access control security
- Emergency exit scenarios

## 🔧 Usage

### Deploying a Vault

```solidity
// Deploy CORE vault with custom parameters
Vault vault = new Vault(
    coreToken,         // CORE token address
    "Vault CORE",      // Token name
    "vCORE",          // Token symbol
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

// Create CORE vault through factory
factory.createVault(
    coreToken,
    "Vault CORE",
    "vCORE",
    customManager,     // Optional: use custom manager
    customAgent,       // Optional: use custom agent
    withdrawalFee,
    yieldRate,
    { value: creationFee }
);
```

### Core Chain Strategy Integration

```solidity
// Deploy CoreStrategy
CoreStrategy coreStrategy = new CoreStrategy(
    coreToken,          // CORE token address
    stakeHub,           // Core Chain StakeHub address
    coreAgent,          // Core Chain Agent address
    validatorAddress    // Default validator to delegate to
);

// Add CORE staking strategy to vault
vault.addStrategy(address(coreStrategy));

// Execute CORE staking (delegate to validator)
vault.depositToStrategy(address(coreStrategy), amount, validatorData);

// Harvest staking rewards
vault.harvestStrategy(address(coreStrategy), "0x");

// Emergency exit (undelegate from validator)
vault.emergencyExitStrategy(address(coreStrategy), validatorData);
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

### Core Chain Scripts

```bash
# Complete System Deployment
npm run deploy:vault-system:testnet  # Deploy complete vault system on testnet
npm run deploy:vault-system:mainnet  # Deploy complete vault system on mainnet
npm run deploy:with-factory          # Deploy system with VaultFactory

# Individual Component Deployment
npm run deploy:core-testnet          # Deploy CoreStrategy only
npm run deploy:core-mainnet          # Deploy CoreStrategy only

# stCORE Token Management
npm run tokens:core-testnet          # Get stCORE tokens on testnet
npm run deploy:mock-stcore           # Deploy mock stCORE token for testing

# Strategy Interaction
npm run interact:core-testnet        # Interact with strategy on testnet
npm run interact:core-mainnet        # Interact with strategy on mainnet

# Monitoring & Status
npm run status:core-testnet          # Check vault and strategy status
npm run status:core-mainnet          # Check status on mainnet

# Development
npm run compile                      # Compile contracts
npm run test                         # Run all tests
npm run test:core                    # Run CoreStrategy tests only
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

### Core Chain Resources

- [Core Chain Official Website](https://coredao.org/)
- [Core Chain Documentation](https://docs.coredao.org/)
- [Core Chain StakeHub](https://docs.coredao.org/developer/develop-on-core/building-on-core/staking)
- [Core Chain Testnet Faucet](https://scan.test.btcs.network/faucet)

### Development Resources

- [OpenZeppelin Contracts](https://openzeppelin.com/contracts/)
- [ERC4626 Standard](https://eips.ethereum.org/EIPS/eip-4626)
- [Hardhat Framework](https://hardhat.org/)

## 🏗️ Quick Start for Core Chain

### Complete Development Flow

1. **Setup Environment**

```bash
# Clone and install
git clone <repository>
cd contracts-core
npm install

# Setup environment variables (create .env file)
# Add: PRIV_KEY, CORE_TESTNET_VALIDATOR, etc.
```

2. **Development & Testing**

```bash
# Run tests first
npm run test:core

# Deploy mock stCORE token (testnet only)
npm run deploy:mock-stcore

# Get test stCORE tokens
npm run tokens:core-testnet
```

3. **Deploy Complete System**

```bash
# Deploy complete vault system (recommended)
npm run deploy:vault-system:testnet

# Or deploy individual components
npm run deploy:core-testnet        # CoreStrategy only
```

4. **Interact & Monitor**

```bash
# Check status
npm run status:core-testnet

# Interact with strategy (stake, harvest, etc.)
npm run interact:core-testnet
```

### Production Flow

```bash
# For Core Mainnet
npm run deploy:vault-system:mainnet  # Deploy complete system
npm run interact:core-mainnet        # Interact with strategy
npm run status:core-mainnet          # Monitor status
```

## 📊 Core Chain Networks

### Mainnet

- **Chain ID**: 1116
- **RPC**: https://rpc.coredao.org/
- **Explorer**: https://scan.coredao.org/

### Testnet

- **Chain ID**: 1114
- **RPC**: https://rpc.test2.btcs.network
- **Explorer**: https://scan.test2.btcs.network/
