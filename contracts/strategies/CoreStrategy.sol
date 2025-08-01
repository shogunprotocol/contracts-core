// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "../interfaces/IStakeHub.sol";
import "../interfaces/ICoreAgent.sol";

/**
 * @title CoreStrategy
 * @dev Strategy implementation for Core Chain StakeHub integration
 * @notice This strategy allows interaction with Core Chain's StakeHub for CORE token staking
 * @custom:security-contact security@vaults.com
 */
contract CoreStrategy is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // State variables - immutable for gas optimization
    address public immutable underlyingToken; // CORE token
    address public immutable stakeHub; // StakeHub contract
    address public immutable coreAgent; // Core Agent contract
    address public defaultValidator; // Default validator to delegate to

    // Mutable state
    address public vault;
    bool public paused;
    uint256 public totalStaked;

    // Events
    event Staked(address indexed validator, uint256 amount);
    event Unstaked(address indexed validator, uint256 amount);
    event RewardsClaimed(uint256 totalReward);
    event VaultSet(address vault);
    event PausedState(bool isPaused);
    event ValidatorChanged(
        address indexed oldValidator,
        address indexed newValidator
    );

    // Errors
    error NoVaultSet();
    error StrategyPaused();
    error InvalidAmount();
    error InvalidAddress();
    error StakingFailed(string reason);
    error UnstakingFailed(string reason);
    error NoValidator();
    error InsufficientStake();

    // Modifiers
    modifier onlyVault() {
        if (vault == address(0)) revert NoVaultSet();
        if (msg.sender != vault) {
            revert("Only vault can call");
        }
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert StrategyPaused();
        _;
    }

    /**
     * @dev Constructor for initializing the Core strategy
     * @param _underlyingToken Address of the CORE token
     * @param _stakeHub Address of the StakeHub contract
     * @param _coreAgent Address of the Core Agent contract
     * @param _defaultValidator Default validator address for delegation
     */
    constructor(
        address _underlyingToken,
        address _stakeHub,
        address _coreAgent,
        address _defaultValidator
    ) {
        require(_underlyingToken != address(0), "Invalid token address");
        require(_stakeHub != address(0), "Invalid StakeHub address");
        require(_coreAgent != address(0), "Invalid Core Agent address");
        require(_defaultValidator != address(0), "Invalid validator address");

        underlyingToken = _underlyingToken;
        stakeHub = _stakeHub;
        coreAgent = _coreAgent;
        defaultValidator = _defaultValidator;
    }

    /**
     * @dev Sets the vault address
     * @param _vault Address of the vault
     * @notice This can only be set once for security reasons
     */
    function setVault(address _vault) external {
        require(_vault != address(0), "Invalid vault address");
        require(vault == address(0), "Vault already set");
        vault = _vault;
        emit VaultSet(_vault);
    }

    /**
     * @dev Changes the default validator
     * @param _newValidator Address of the new validator
     */
    function setDefaultValidator(address _newValidator) external onlyVault {
        require(_newValidator != address(0), "Invalid validator address");
        address oldValidator = defaultValidator;
        defaultValidator = _newValidator;
        emit ValidatorChanged(oldValidator, _newValidator);
    }

    /**
     * @dev Executes the strategy by staking CORE tokens
     * @param amount Amount of tokens to stake
     * @param data Additional data (validator address if different from default)
     */
    function execute(
        uint256 amount,
        bytes calldata data
    ) external onlyVault nonReentrant whenNotPaused {
        if (amount == 0) revert InvalidAmount();

        // Handle the token transfer first
        IERC20(underlyingToken).safeTransferFrom(vault, address(this), amount);

        // Determine validator (use data if provided, otherwise default)
        address validator = defaultValidator;
        if (data.length == 32) {
            validator = abi.decode(data, (address));
            require(validator != address(0), "Invalid validator in data");
        }

        // Approve Core Agent to spend tokens
        uint256 currentAllowance = IERC20(underlyingToken).allowance(
            address(this),
            coreAgent
        );
        if (currentAllowance < amount) {
            if (currentAllowance > 0) {
                IERC20(underlyingToken).approve(coreAgent, 0);
            }
            IERC20(underlyingToken).approve(coreAgent, amount);
        }

        // Execute the staking delegation
        try ICoreAgent(coreAgent).delegate(validator, amount) {
            totalStaked += amount;

            // Notify StakeHub of stake change
            IStakeHub(stakeHub).onStakeChange(address(this));

            emit Staked(validator, amount);
        } catch Error(string memory reason) {
            // Revoke approval for security
            IERC20(underlyingToken).approve(coreAgent, 0);
            revert StakingFailed(reason);
        } catch {
            // Revoke approval for security
            IERC20(underlyingToken).approve(coreAgent, 0);
            revert StakingFailed("Unknown error during staking");
        }
    }

    /**
     * @dev Harvests rewards from the StakeHub
     * @notice Additional data parameter is unused for Core staking
     */
    function harvest(
        bytes calldata /* data */
    ) external onlyVault nonReentrant {
        try IStakeHub(stakeHub).claimReward() returns (
            uint256[] memory rewards
        ) {
            uint256 totalReward = 0;
            for (uint256 i = 0; i < rewards.length; i++) {
                totalReward += rewards[i];
            }

            if (totalReward > 0) {
                // Transfer rewards to vault (rewards are in native token/ETH)
                (bool success, ) = payable(vault).call{value: totalReward}("");
                require(success, "Failed to transfer rewards");
                emit RewardsClaimed(totalReward);
            }
        } catch Error(string memory /* reason */) {
            // Non-critical operation, just emit event
            emit RewardsClaimed(0);
        }
    }

    /**
     * @dev Gets the current staked balance
     * @return uint256 Total staked amount
     */
    function getBalance() public view returns (uint256) {
        return totalStaked;
    }

    /**
     * @dev Performs an emergency exit, unstaking all funds
     * @param data Additional data (validator address if different from default)
     */
    function emergencyExit(
        bytes calldata data
    ) external onlyVault nonReentrant {
        if (totalStaked == 0) {
            revert InsufficientStake();
        }

        // Determine validator
        address validator = defaultValidator;
        if (data.length == 32) {
            validator = abi.decode(data, (address));
            require(validator != address(0), "Invalid validator in data");
        }

        uint256 amountToUnstake = totalStaked;

        try ICoreAgent(coreAgent).undelegate(validator, amountToUnstake) {
            totalStaked = 0;

            // Notify StakeHub of stake change
            IStakeHub(stakeHub).onStakeChange(address(this));

            // Transfer any liquid tokens back to vault
            uint256 tokenBalance = IERC20(underlyingToken).balanceOf(
                address(this)
            );
            if (tokenBalance > 0) {
                IERC20(underlyingToken).safeTransfer(vault, tokenBalance);
            }

            emit Unstaked(validator, amountToUnstake);
        } catch Error(string memory reason) {
            revert UnstakingFailed(reason);
        } catch {
            revert UnstakingFailed("Unknown error during unstaking");
        }
    }

    /**
     * @dev Claims rewards without harvesting (for manual reward calculation)
     */
    function calculateRewards() external onlyVault {
        IStakeHub(stakeHub).calculateReward(address(this));
    }

    /**
     * @dev Gets delegator information from StakeHub
     * @return Delegator struct with rewards and round information
     */
    function getDelegatorInfo()
        external
        view
        returns (IStakeHub.Delegator memory)
    {
        return IStakeHub(stakeHub).getDelegator(address(this));
    }

    /**
     * @dev Sets the pause state
     * @param _paused New pause state
     */
    function setPaused(bool _paused) external onlyVault {
        paused = _paused;
        emit PausedState(_paused);
    }

    /**
     * @dev Allows the contract to receive ETH rewards
     */
    receive() external payable {
        // Accept ETH rewards from StakeHub
    }

    /**
     * @dev Emergency function to recover stuck tokens (only non-underlying tokens)
     * @param token Token address to recover
     * @param amount Amount to recover
     */
    function emergencyTokenRecovery(
        address token,
        uint256 amount
    ) external onlyVault {
        require(token != underlyingToken, "Cannot recover underlying token");
        require(token != address(0), "Invalid token address");

        IERC20(token).safeTransfer(vault, amount);
    }
}
