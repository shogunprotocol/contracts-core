// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/ICoreAgent.sol";

/**
 * @title MockCoreAgent
 * @dev Mock implementation of CoreAgent for testing purposes
 * @notice This mock simulates the Core Chain Agent behavior for testing
 */
contract MockCoreAgent is ICoreAgent {
    using SafeERC20 for IERC20;

    // Mock state
    address public immutable coreToken;
    mapping(address => mapping(address => uint256)) public delegatedAmounts; // delegator => validator => amount
    mapping(address => uint256) public totalDelegated; // delegator => total amount
    mapping(address => uint256) public pendingRewards; // delegator => pending rewards

    bool public shouldFailDelegate = false;
    bool public shouldFailUndelegate = false;

    // Events for testing
    event Delegated(
        address indexed delegator,
        address indexed validator,
        uint256 amount
    );
    event Undelegated(
        address indexed delegator,
        address indexed validator,
        uint256 amount
    );
    event RewardDistributed(
        address[] validators,
        uint256[] rewards,
        uint256 roundTag
    );
    event NewRoundSet(address[] validators, uint256 round);

    constructor(address _coreToken) {
        require(_coreToken != address(0), "Invalid core token address");
        coreToken = _coreToken;
    }

    /**
     * @dev Sets failure modes for testing
     * @param _shouldFailDelegate Whether delegate should fail
     * @param _shouldFailUndelegate Whether undelegate should fail
     */
    function setFailureModes(
        bool _shouldFailDelegate,
        bool _shouldFailUndelegate
    ) external {
        shouldFailDelegate = _shouldFailDelegate;
        shouldFailUndelegate = _shouldFailUndelegate;
    }

    /**
     * @dev Sets pending rewards for a delegator (for testing)
     * @param delegator Address of the delegator
     * @param reward Reward amount
     */
    function setPendingRewards(address delegator, uint256 reward) external {
        pendingRewards[delegator] = reward;
    }

    /**
     * @dev Delegates CORE tokens to a validator
     * @param validator Address of the validator to delegate to
     * @param amount Amount of CORE tokens to delegate
     */
    function delegate(
        address validator,
        uint256 amount
    ) external payable override {
        require(!shouldFailDelegate, "Delegate operation failed (mock)");
        require(validator != address(0), "Invalid validator address");
        require(amount > 0, "Amount must be greater than 0");

        // Transfer tokens from delegator to this contract
        IERC20(coreToken).safeTransferFrom(msg.sender, address(this), amount);

        // Update delegation records
        delegatedAmounts[msg.sender][validator] += amount;
        totalDelegated[msg.sender] += amount;

        emit Delegated(msg.sender, validator, amount);
    }

    /**
     * @dev Undelegates CORE tokens from a validator
     * @param validator Address of the validator to undelegate from
     * @param amount Amount of CORE tokens to undelegate
     */
    function undelegate(address validator, uint256 amount) external override {
        require(!shouldFailUndelegate, "Undelegate operation failed (mock)");
        require(validator != address(0), "Invalid validator address");
        require(amount > 0, "Amount must be greater than 0");

        // For emergency exits (when trying to withdraw total amount), allow any validator
        if (amount == totalDelegated[msg.sender]) {
            // Clear all delegations and use total delegated amount
            totalDelegated[msg.sender] = 0;
            // Note: In a real implementation, we'd iterate through all validators
            // For mock purposes, we'll just clear the current validator
            if (delegatedAmounts[msg.sender][validator] > 0) {
                delegatedAmounts[msg.sender][validator] = 0;
            }
        } else {
            // Normal undelegate: check specific validator has enough delegation
            require(
                delegatedAmounts[msg.sender][validator] >= amount,
                "Insufficient delegated amount"
            );
            delegatedAmounts[msg.sender][validator] -= amount;
            totalDelegated[msg.sender] -= amount;
        }

        // Transfer tokens back to delegator
        IERC20(coreToken).safeTransfer(msg.sender, amount);

        emit Undelegated(msg.sender, validator, amount);
    }

    /**
     * @dev Claims rewards for a delegator
     * @param delegator Address of the delegator
     * @param accStakedCoreAmount Accumulated staked CORE amount
     * @param claim Whether to actually claim or just calculate
     * @return reward Reward amount
     * @return floatReward Float reward amount (simplified for mock)
     * @return newAccStakedCoreAmount New accumulated staked CORE amount
     */
    function claimReward(
        address delegator,
        uint256 accStakedCoreAmount,
        uint256 /* round */,
        bool claim
    )
        external
        override
        returns (
            uint256 reward,
            int256 floatReward,
            uint256 newAccStakedCoreAmount
        )
    {
        reward = pendingRewards[delegator];
        floatReward = int256(reward / 10); // Mock float reward as 10% of main reward
        newAccStakedCoreAmount =
            accStakedCoreAmount +
            totalDelegated[delegator];

        if (claim && reward > 0) {
            pendingRewards[delegator] = 0;
            // In real implementation, rewards would be transferred here
        }
    }

    /**
     * @dev Gets stake amounts for candidates
     * @param candidates Array of candidate addresses
     * @return amounts Array of stake amounts for each candidate
     * @return totalAmount Total stake amount across all candidates
     */
    function getStakeAmounts(
        address[] calldata candidates,
        uint256 /* round */
    )
        external
        pure
        override
        returns (uint256[] memory amounts, uint256 totalAmount)
    {
        amounts = new uint256[](candidates.length);
        totalAmount = 0;

        for (uint256 i = 0; i < candidates.length; i++) {
            // Mock: return some stake amount based on candidate address
            amounts[i] = uint256(uint160(candidates[i])) % 1000000; // Mock stake amount
            totalAmount += amounts[i];
        }
    }

    /**
     * @dev Distributes rewards to validators
     * @param validators Array of validator addresses
     * @param rewards Array of reward amounts
     * @param roundTag Round tag
     */
    function distributeReward(
        address[] calldata validators,
        uint256[] calldata rewards,
        uint256 roundTag
    ) external override {
        require(validators.length == rewards.length, "Arrays length mismatch");
        emit RewardDistributed(validators, rewards, roundTag);
    }

    /**
     * @dev Sets a new round
     * @param validators Array of elected validators
     * @param round New round number
     */
    function setNewRound(
        address[] calldata validators,
        uint256 round
    ) external override {
        emit NewRoundSet(validators, round);
    }

    /**
     * @dev Gets total delegated amount for a delegator
     * @param delegator Address of the delegator
     * @return Total delegated amount
     */
    function getTotalDelegated(
        address delegator
    ) external view returns (uint256) {
        return totalDelegated[delegator];
    }

    /**
     * @dev Gets delegated amount for a specific validator
     * @param delegator Address of the delegator
     * @param validator Address of the validator
     * @return Delegated amount
     */
    function getDelegatedAmount(
        address delegator,
        address validator
    ) external view returns (uint256) {
        return delegatedAmounts[delegator][validator];
    }

    /**
     * @dev Emergency function to recover tokens (testing only)
     * @param token Token address
     * @param amount Amount to recover
     */
    function emergencyRecover(address token, uint256 amount) external {
        IERC20(token).safeTransfer(msg.sender, amount);
    }
}
