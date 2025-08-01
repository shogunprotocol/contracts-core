// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.26;

import "../interfaces/IStakeHub.sol";

/**
 * @title MockStakeHub
 * @dev Mock implementation of StakeHub for testing purposes
 * @notice This mock simulates the Core Chain StakeHub behavior for testing
 */
contract MockStakeHub is IStakeHub {
    // Mock state
    mapping(address => Delegator) public delegators;
    mapping(address => uint256) public pendingRewards;
    uint256 public currentRound = 1;

    // Events for testing
    event StakeChangeNotified(address indexed delegator);
    event RewardsClaimed(address indexed delegator, uint256[] rewards);
    event RewardsCalculated(address indexed delegator);

    /**
     * @dev Sets pending rewards for a delegator (for testing)
     * @param delegator Address of the delegator
     * @param rewardAmounts Array of reward amounts for each asset type
     */
    function setPendingRewards(
        address delegator,
        uint256[] calldata rewardAmounts
    ) external {
        delegators[delegator].rewards = rewardAmounts;
        uint256 totalReward = 0;
        for (uint256 i = 0; i < rewardAmounts.length; i++) {
            totalReward += rewardAmounts[i];
        }
        pendingRewards[delegator] = totalReward;
    }

    /**
     * @dev Sets the current round (for testing)
     * @param round New round number
     */
    function setCurrentRound(uint256 round) external {
        currentRound = round;
    }

    /**
     * @dev Notifies StakeHub of stake changes
     * @param delegator Address of the delegator
     */
    function onStakeChange(address delegator) external override {
        delegators[delegator].changeRound = currentRound;
        emit StakeChangeNotified(delegator);
    }

    /**
     * @dev Claims rewards for the caller
     * @return rewards Array of reward amounts for each asset type
     */
    function claimReward()
        external
        override
        returns (uint256[] memory rewards)
    {
        address delegator = msg.sender;
        Delegator storage d = delegators[delegator];

        // Return stored rewards and clear them
        rewards = new uint256[](d.rewards.length);
        for (uint256 i = 0; i < d.rewards.length; i++) {
            rewards[i] = d.rewards[i];
        }

        // Clear rewards after claiming
        delete delegators[delegator].rewards;

        // Transfer ETH rewards to simulate real behavior
        uint256 totalReward = pendingRewards[delegator];
        if (totalReward > 0) {
            pendingRewards[delegator] = 0;
            (bool success, ) = payable(delegator).call{value: totalReward}("");
            require(success, "ETH transfer failed");
        }

        emit RewardsClaimed(delegator, rewards);
    }

    /**
     * @dev Calculates rewards for a delegator without claiming
     * @param delegator Address of the delegator
     */
    function calculateReward(address delegator) external override {
        delegators[delegator].changeRound = currentRound;
        emit RewardsCalculated(delegator);
    }

    /**
     * @dev Gets delegator information
     * @param delegator Address of the delegator
     * @return Delegator struct with rewards and round information
     */
    function getDelegator(
        address delegator
    ) external view override returns (Delegator memory) {
        return delegators[delegator];
    }

    /**
     * @dev Claims rewards on behalf of a delegator (PledgeAgent only)
     * @param delegator Address of the delegator
     * @return reward Total reward amount claimed
     */
    function proxyClaimReward(
        address delegator
    ) external override returns (uint256 reward) {
        Delegator storage d = delegators[delegator];

        // Calculate total reward
        for (uint256 i = 0; i < d.rewards.length; i++) {
            reward += d.rewards[i];
        }

        // Clear rewards after claiming
        delete delegators[delegator].rewards;

        // Transfer ETH rewards
        if (reward > 0) {
            (bool success, ) = payable(msg.sender).call{value: reward}("");
            require(success, "ETH transfer failed");
        }
    }

    /**
     * @dev Allows contract to receive ETH for reward distribution
     */
    receive() external payable {}

    /**
     * @dev Funds the contract with ETH for testing rewards
     */
    function fundRewards() external payable {}

    /**
     * @dev Emergency function to drain contract (testing only)
     */
    function emergencyDrain() external {
        (bool success, ) = payable(msg.sender).call{
            value: address(this).balance
        }("");
        require(success, "Drain failed");
    }
}
