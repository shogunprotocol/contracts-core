import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import {
  CoreStrategy,
  MockStakeHub,
  MockCoreAgent,
  MockERC20,
} from "../typechain-types";

describe("CoreStrategy", function () {
  let coreStrategy: CoreStrategy;
  let mockStakeHub: MockStakeHub;
  let mockCoreAgent: MockCoreAgent;
  let coreToken: MockERC20;
  let owner: SignerWithAddress;
  let vault: SignerWithAddress;
  let validator: SignerWithAddress;
  let user: SignerWithAddress;

  const INITIAL_SUPPLY = ethers.parseEther("1000000");
  const STAKE_AMOUNT = ethers.parseEther("1000");

  beforeEach(async function () {
    [owner, vault, validator, user] = await ethers.getSigners();

    // Deploy mock CORE token
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    coreToken = await MockERC20Factory.deploy("Core Token", "CORE", 18);

    // Mint initial supply to owner
    await coreToken.mint(owner.address, INITIAL_SUPPLY);

    // Deploy mock contracts
    const MockStakeHubFactory = await ethers.getContractFactory("MockStakeHub");
    mockStakeHub = await MockStakeHubFactory.deploy();

    const MockCoreAgentFactory = await ethers.getContractFactory(
      "MockCoreAgent"
    );
    mockCoreAgent = await MockCoreAgentFactory.deploy(
      await coreToken.getAddress()
    );

    // Deploy CoreStrategy
    const CoreStrategyFactory = await ethers.getContractFactory("CoreStrategy");
    coreStrategy = await CoreStrategyFactory.deploy(
      await coreToken.getAddress(),
      await mockStakeHub.getAddress(),
      await mockCoreAgent.getAddress(),
      validator.address
    );

    // Set vault
    await coreStrategy.setVault(vault.address);

    // Fund contracts with ETH for rewards
    await mockStakeHub.fundRewards({ value: ethers.parseEther("10") });

    // Transfer tokens to vault for testing
    await coreToken.transfer(vault.address, ethers.parseEther("10000"));
  });

  describe("Deployment", function () {
    it("Should set the correct parameters", async function () {
      expect(await coreStrategy.underlyingToken()).to.equal(
        await coreToken.getAddress()
      );
      expect(await coreStrategy.stakeHub()).to.equal(
        await mockStakeHub.getAddress()
      );
      expect(await coreStrategy.coreAgent()).to.equal(
        await mockCoreAgent.getAddress()
      );
      expect(await coreStrategy.defaultValidator()).to.equal(validator.address);
      expect(await coreStrategy.vault()).to.equal(vault.address);
    });

    it("Should not allow setting vault twice", async function () {
      await expect(coreStrategy.setVault(user.address)).to.be.revertedWith(
        "Vault already set"
      );
    });

    it("Should revert with invalid addresses in constructor", async function () {
      const CoreStrategyFactory = await ethers.getContractFactory(
        "CoreStrategy"
      );

      await expect(
        CoreStrategyFactory.deploy(
          ethers.ZeroAddress,
          await mockStakeHub.getAddress(),
          await mockCoreAgent.getAddress(),
          validator.address
        )
      ).to.be.revertedWith("Invalid token address");
    });
  });

  describe("Vault Management", function () {
    it("Should allow changing default validator", async function () {
      const newValidator = user.address;

      await expect(
        coreStrategy.connect(vault).setDefaultValidator(newValidator)
      )
        .to.emit(coreStrategy, "ValidatorChanged")
        .withArgs(validator.address, newValidator);

      expect(await coreStrategy.defaultValidator()).to.equal(newValidator);
    });

    it("Should not allow non-vault to change validator", async function () {
      await expect(
        coreStrategy.connect(user).setDefaultValidator(user.address)
      ).to.be.revertedWith("Only vault can call");
    });

    it("Should allow vault to pause/unpause", async function () {
      await expect(coreStrategy.connect(vault).setPaused(true))
        .to.emit(coreStrategy, "PausedState")
        .withArgs(true);

      expect(await coreStrategy.paused()).to.be.true;

      await coreStrategy.connect(vault).setPaused(false);
      expect(await coreStrategy.paused()).to.be.false;
    });
  });

  describe("Execute (Staking)", function () {
    beforeEach(async function () {
      // Approve strategy to spend vault's tokens
      await coreToken
        .connect(vault)
        .approve(await coreStrategy.getAddress(), STAKE_AMOUNT);
    });

    it("Should successfully stake tokens", async function () {
      await expect(coreStrategy.connect(vault).execute(STAKE_AMOUNT, "0x"))
        .to.emit(coreStrategy, "Staked")
        .withArgs(validator.address, STAKE_AMOUNT)
        .and.to.emit(mockCoreAgent, "Delegated")
        .withArgs(
          await coreStrategy.getAddress(),
          validator.address,
          STAKE_AMOUNT
        )
        .and.to.emit(mockStakeHub, "StakeChangeNotified")
        .withArgs(await coreStrategy.getAddress());

      expect(await coreStrategy.getBalance()).to.equal(STAKE_AMOUNT);
      expect(await coreStrategy.totalStaked()).to.equal(STAKE_AMOUNT);
    });

    it("Should stake to custom validator when data provided", async function () {
      const customValidator = user.address;
      const validatorData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address"],
        [customValidator]
      );

      await expect(
        coreStrategy.connect(vault).execute(STAKE_AMOUNT, validatorData)
      )
        .to.emit(coreStrategy, "Staked")
        .withArgs(customValidator, STAKE_AMOUNT);
    });

    it("Should revert with zero amount", async function () {
      await expect(
        coreStrategy.connect(vault).execute(0, "0x")
      ).to.be.revertedWithCustomError(coreStrategy, "InvalidAmount");
    });

    it("Should revert when paused", async function () {
      await coreStrategy.connect(vault).setPaused(true);

      await expect(
        coreStrategy.connect(vault).execute(STAKE_AMOUNT, "0x")
      ).to.be.revertedWithCustomError(coreStrategy, "StrategyPaused");
    });

    it("Should revert when not called by vault", async function () {
      await expect(
        coreStrategy.connect(user).execute(STAKE_AMOUNT, "0x")
      ).to.be.revertedWith("Only vault can call");
    });

    it("Should handle delegation failure", async function () {
      // Set mock to fail delegation
      await mockCoreAgent.setFailureModes(true, false);

      await expect(
        coreStrategy.connect(vault).execute(STAKE_AMOUNT, "0x")
      ).to.be.revertedWithCustomError(coreStrategy, "StakingFailed");
    });
  });

  describe("Harvest (Claiming Rewards)", function () {
    beforeEach(async function () {
      // First stake some tokens
      await coreToken
        .connect(vault)
        .approve(await coreStrategy.getAddress(), STAKE_AMOUNT);
      await coreStrategy.connect(vault).execute(STAKE_AMOUNT, "0x");

      // Set up pending rewards
      const rewardAmounts = [
        ethers.parseEther("10"),
        ethers.parseEther("5"),
        ethers.parseEther("3"),
      ];
      await mockStakeHub.setPendingRewards(
        await coreStrategy.getAddress(),
        rewardAmounts
      );

      // Fund the MockStakeHub with enough ETH for rewards
      const totalRewards = ethers.parseEther("18"); // 10 + 5 + 3
      await owner.sendTransaction({
        to: await mockStakeHub.getAddress(),
        value: totalRewards,
      });
    });

    it("Should successfully harvest rewards", async function () {
      const initialVaultBalance = await ethers.provider.getBalance(
        vault.address
      );

      await expect(coreStrategy.connect(vault).harvest("0x"))
        .to.emit(coreStrategy, "RewardsClaimed")
        .and.to.emit(mockStakeHub, "RewardsClaimed");

      // Check that vault received ETH rewards
      const finalVaultBalance = await ethers.provider.getBalance(vault.address);
      expect(finalVaultBalance).to.be.gt(initialVaultBalance);
    });

    it("Should handle harvest with no rewards", async function () {
      // Clear rewards
      await mockStakeHub.setPendingRewards(await coreStrategy.getAddress(), []);

      await expect(coreStrategy.connect(vault).harvest("0x")).to.not.be
        .reverted;
    });

    it("Should not allow non-vault to harvest", async function () {
      await expect(coreStrategy.connect(user).harvest("0x")).to.be.revertedWith(
        "Only vault can call"
      );
    });
  });

  describe("Emergency Exit", function () {
    beforeEach(async function () {
      // First stake some tokens
      await coreToken
        .connect(vault)
        .approve(await coreStrategy.getAddress(), STAKE_AMOUNT);
      await coreStrategy.connect(vault).execute(STAKE_AMOUNT, "0x");
    });

    it("Should successfully perform emergency exit", async function () {
      const initialVaultBalance = await coreToken.balanceOf(vault.address);

      await expect(coreStrategy.connect(vault).emergencyExit("0x"))
        .to.emit(coreStrategy, "Unstaked")
        .withArgs(validator.address, STAKE_AMOUNT)
        .and.to.emit(mockCoreAgent, "Undelegated")
        .withArgs(
          await coreStrategy.getAddress(),
          validator.address,
          STAKE_AMOUNT
        )
        .and.to.emit(mockStakeHub, "StakeChangeNotified")
        .withArgs(await coreStrategy.getAddress());

      expect(await coreStrategy.getBalance()).to.equal(0);
      expect(await coreStrategy.totalStaked()).to.equal(0);

      // Check tokens were returned to vault
      const finalVaultBalance = await coreToken.balanceOf(vault.address);
      expect(finalVaultBalance).to.be.gt(initialVaultBalance);
    });

    it("Should revert when no stake to exit", async function () {
      // First perform one emergency exit
      await coreStrategy.connect(vault).emergencyExit("0x");

      // Try to exit again
      await expect(
        coreStrategy.connect(vault).emergencyExit("0x")
      ).to.be.revertedWithCustomError(coreStrategy, "InsufficientStake");
    });

    it("Should handle undelegate failure", async function () {
      // Set mock to fail undelegation
      await mockCoreAgent.setFailureModes(false, true);

      await expect(
        coreStrategy.connect(vault).emergencyExit("0x")
      ).to.be.revertedWithCustomError(coreStrategy, "UnstakingFailed");
    });

    it("Should exit with custom validator", async function () {
      const customValidator = user.address;
      const validatorData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address"],
        [customValidator]
      );

      await expect(coreStrategy.connect(vault).emergencyExit(validatorData))
        .to.emit(coreStrategy, "Unstaked")
        .withArgs(customValidator, STAKE_AMOUNT);
    });
  });

  describe("Reward Calculation", function () {
    beforeEach(async function () {
      // First stake some tokens
      await coreToken
        .connect(vault)
        .approve(await coreStrategy.getAddress(), STAKE_AMOUNT);
      await coreStrategy.connect(vault).execute(STAKE_AMOUNT, "0x");
    });

    it("Should calculate rewards without claiming", async function () {
      await expect(coreStrategy.connect(vault).calculateRewards())
        .to.emit(mockStakeHub, "RewardsCalculated")
        .withArgs(await coreStrategy.getAddress());
    });

    it("Should get delegator info", async function () {
      const delegatorInfo = await coreStrategy.getDelegatorInfo();
      expect(delegatorInfo.changeRound).to.be.gt(0);
    });
  });

  describe("Emergency Token Recovery", function () {
    let otherToken: MockERC20;

    beforeEach(async function () {
      // Deploy another token
      const MockERC20Factory = await ethers.getContractFactory("MockERC20");
      otherToken = await MockERC20Factory.deploy("Other Token", "OTHER", 18);

      // Mint some tokens
      await otherToken.mint(owner.address, ethers.parseEther("1000"));

      // Send some tokens to strategy
      await otherToken.transfer(
        await coreStrategy.getAddress(),
        ethers.parseEther("100")
      );
    });

    it("Should recover non-underlying tokens", async function () {
      const initialVaultBalance = await otherToken.balanceOf(vault.address);
      const recoveryAmount = ethers.parseEther("100");

      await coreStrategy
        .connect(vault)
        .emergencyTokenRecovery(await otherToken.getAddress(), recoveryAmount);

      const finalVaultBalance = await otherToken.balanceOf(vault.address);
      expect(finalVaultBalance - initialVaultBalance).to.equal(recoveryAmount);
    });

    it("Should not allow recovery of underlying token", async function () {
      await expect(
        coreStrategy
          .connect(vault)
          .emergencyTokenRecovery(
            await coreToken.getAddress(),
            ethers.parseEther("100")
          )
      ).to.be.revertedWith("Cannot recover underlying token");
    });

    it("Should not allow non-vault to recover tokens", async function () {
      await expect(
        coreStrategy
          .connect(user)
          .emergencyTokenRecovery(
            await otherToken.getAddress(),
            ethers.parseEther("100")
          )
      ).to.be.revertedWith("Only vault can call");
    });
  });

  describe("Receive ETH", function () {
    it("Should accept ETH rewards", async function () {
      const initialBalance = await ethers.provider.getBalance(
        await coreStrategy.getAddress()
      );

      // Send ETH to strategy
      await owner.sendTransaction({
        to: await coreStrategy.getAddress(),
        value: ethers.parseEther("1"),
      });

      const finalBalance = await ethers.provider.getBalance(
        await coreStrategy.getAddress()
      );
      expect(finalBalance - initialBalance).to.equal(ethers.parseEther("1"));
    });
  });
});
