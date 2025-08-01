// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.26;

/**
 * @title ICoreAgent
 * @dev Interface for Core Chain Agent contract
 * @notice Interface for CORE token staking operations through the agent system
 */
interface ICoreAgent {
    /**
     * @dev Delegates CORE tokens to a validator
     * @param validator Address of the validator to delegate to
     * @param amount Amount of CORE tokens to delegate
     */
    function delegate(address validator, uint256 amount) external payable;

    /**
     * @dev Undelegates CORE tokens from a validator
     * @param validator Address of the validator to undelegate from
     * @param amount Amount of CORE tokens to undelegate
     */
    function undelegate(address validator, uint256 amount) external;

    /**
     * @dev Claims rewards for a delegator
     * @param delegator Address of the delegator
     * @param accStakedCoreAmount Accumulated staked CORE amount
     * @param round Round number
     * @param claim Whether to actually claim or just calculate
     * @return reward Reward amount
     * @return floatReward Float reward amount
     * @return newAccStakedCoreAmount New accumulated staked CORE amount
     */
    function claimReward(
        address delegator,
        uint256 accStakedCoreAmount,
        uint256 round,
        bool claim
    )
        external
        returns (
            uint256 reward,
            int256 floatReward,
            uint256 newAccStakedCoreAmount
        );

    /**
     * @dev Gets stake amounts for candidates
     * @param candidates Array of candidate addresses
     * @param round Round number
     * @return amounts Array of stake amounts for each candidate
     * @return totalAmount Total stake amount across all candidates
     */
    function getStakeAmounts(
        address[] calldata candidates,
        uint256 round
    ) external view returns (uint256[] memory amounts, uint256 totalAmount);

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
    ) external;

    /**
     * @dev Sets a new round
     * @param validators Array of elected validators
     * @param round New round number
     */
    function setNewRound(address[] calldata validators, uint256 round) external;
}
