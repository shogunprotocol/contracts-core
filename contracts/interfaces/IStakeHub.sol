// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.26;

/**
 * @title IStakeHub
 * @dev Interface for Core Chain StakeHub contract
 * @notice Interface for interacting with Core Chain's hybrid staking system
 */
interface IStakeHub {
    struct Delegator {
        uint256 changeRound;
        uint256[] rewards;
    }

    /**
     * @dev Notifies StakeHub of stake changes
     * @param delegator Address of the delegator
     */
    function onStakeChange(address delegator) external;

    /**
     * @dev Claims rewards for the caller
     * @return rewards Array of reward amounts for each asset type
     */
    function claimReward() external returns (uint256[] memory rewards);

    /**
     * @dev Calculates rewards for a delegator without claiming
     * @param delegator Address of the delegator
     */
    function calculateReward(address delegator) external;

    /**
     * @dev Gets delegator information
     * @param delegator Address of the delegator
     * @return Delegator struct with rewards and round information
     */
    function getDelegator(
        address delegator
    ) external view returns (Delegator memory);

    /**
     * @dev Claims rewards on behalf of a delegator (PledgeAgent only)
     * @param delegator Address of the delegator
     * @return reward Total reward amount claimed
     */
    function proxyClaimReward(
        address delegator
    ) external returns (uint256 reward);
}
