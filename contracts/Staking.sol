// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Staking is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    struct Stake {
        uint256 amount;
        uint256 reward;
        uint64 timeStamp;
    }

    IERC20 public simpleToken;
    IERC20 public liquidityToken;
    uint256 public rewardPeriod;
    uint64 public startTimestamp;
    uint64 public endTimestamp;
    uint16 public percentPerPeriod;

    mapping(address => Stake) public stakers;
    enum OwnerActions {changedpercentPerPeriod, changedRewardPeriod}
    
    event LogOwnerAction(OwnerActions action, uint256 value);
    event LogPayout(address user, uint256 stakedAmount, uint256 rewardAmount, uint64 timeStamp);

    modifier validStaker() {
        require(stakers[msg.sender].timeStamp != 0, 'You have not staked any token yet');
        require(stakers[msg.sender].amount != 0, 'You have already unstaked all your tokens');
        _;
    }

    /**
    * @notice Staking helps to increase your deposited(staked) tokens after some period of time to
    * already known percentage.
    * @dev Staking  
    * @param _simpleToken Address of the staking token
    * @param _liquidityToken Address of the reward token
    * @param _rewardPeriod Period of time in seconds
    * @param _startTimestamp Contract strating time
    * @param _endTimestamp Contract ending time
    * @param _percentPerPeriod percentage of total balance as reward
     */
    constructor(
        IERC20 _simpleToken, 
        IERC20 _liquidityToken, 
        uint256 _rewardPeriod, 
        uint64 _startTimestamp,
        uint64 _endTimestamp,
        uint16 _percentPerPeriod
        ) {
        simpleToken = _simpleToken;
        liquidityToken = _liquidityToken;
        rewardPeriod = _rewardPeriod;
        startTimestamp = _startTimestamp;
        endTimestamp = _endTimestamp;
        percentPerPeriod = _percentPerPeriod;
    }

    /**
    * @notice Update reward percentage
    * @dev Only owner can call this function
    * @param _percent Number between 0 - 100
     */
    function setPercentPerPeriod(uint16 _percent) external onlyOwner{
        percentPerPeriod = _percent;
        emit LogOwnerAction(OwnerActions(0), _percent);
    }

    /**
    * @notice Updates reward period
    * @dev Only owner can call this function
    * @param _seconds Reward period in seconds
     */
    function setRewardPeriod(uint256 _seconds) external onlyOwner{
        rewardPeriod = _seconds;
        emit LogOwnerAction(OwnerActions(1), _seconds);
    }

    /**
    * @notice Withdraw specified amount of tokens
    * @dev Only owner can call this function 
    * @param _amount Amount of tokens to withdraw
    * @param _token Token address
     */
    function withdraw(uint256 _amount, IERC20 _token) external onlyOwner {
        _token.transfer(msg.sender, _amount);
    }

    /**
    * @notice Stake user's tokens.
    * @dev Add new users in stakers list or update already exist users with adding their rewards 
    * in their stake amount
    * @param _amount Tokens amount to stake
     */
    function stakeTokens(uint _amount) external nonReentrant {
        // Minimum 1 token should be stacked
        require(_amount > 1 ether, 'You cannot stake less than 1 token');
        require(startTimestamp <= uint64(block.timestamp), 'Staking has not been started yet');
        require(uint64(block.timestamp) <= endTimestamp, 'Staking has been finished');
        simpleToken.transferFrom(msg.sender, address(this), _amount);

        if(stakers[msg.sender].timeStamp == 0) {
            // Add user to stakers array if they haven't staked already
            stakers[msg.sender].amount = _amount;
        } else {
            stakers[msg.sender].reward = rewardAmountCounter(msg.sender, uint64(block.timestamp));
            stakers[msg.sender].amount = stakers[msg.sender].amount + _amount;
            
            emit LogPayout(msg.sender, stakers[msg.sender].amount, stakers[msg.sender].reward, uint64(block.timestamp));
        }

        // Update staking status to track
        stakers[msg.sender].timeStamp = uint64(block.timestamp);
    }
    
    /**
    * @notice Allow user to unstake total balance and withdraw simpleToken from the contract
    * @dev User will get his/her staked balance and reward amount at once 
     */
     function unstakeTokens() external nonReentrant validStaker {
        require(block.timestamp >= endTimestamp, 'The staking period has not been finished');
        uint256 balance = stakers[msg.sender].amount;
        uint256 rewardAmount = rewardAmountCounter(msg.sender, endTimestamp) + stakers[msg.sender].reward;
    
        // reset staker's variables
        stakers[msg.sender].amount = 0;
        stakers[msg.sender].reward = 0;
        stakers[msg.sender].timeStamp = 0;
    
        // transfer simpleToken tokens out of this contract to the msg.sender
        simpleToken.transfer(msg.sender, balance);
    
        // transfer simpleToken tokens out of this contract to the msg.sender
        liquidityToken.transfer(msg.sender, rewardAmount);
        
        emit LogPayout(msg.sender, balance, rewardAmount, endTimestamp);
    } 

    /**
    * @notice Allow user to recieve only reward tokens and updates staked tokens strat time.
    * @dev It will provide reward tokens to the user and reset timer. So user need to wait at least
    * one reward period in order to get any reward after.
     */
    function claimReward() external nonReentrant validStaker {
        uint256 rewardAmount = rewardAmountCounter(msg.sender, uint64(block.timestamp));

        if(rewardAmount > 0) {
            require(rewardAmount <= simpleToken.balanceOf(address(this)), 'We have not enough balance to fullfil your request');
            stakers[msg.sender].timeStamp = uint64(block.timestamp);
            liquidityToken.transfer(msg.sender, rewardAmount);
        }

        emit LogPayout(msg.sender, stakers[msg.sender].amount, rewardAmount, uint64(block.timestamp));
    }
    
    /**
    * @notice Inner function calculating reward amount
    * @dev rewardAmountCounter
    * @param _address Address of the user
    * @param _currentTime time used for counting reward
    * @return uint256 reward amount
     */
    function rewardAmountCounter(address _address, uint64 _currentTime) internal view returns(uint256) {
        uint256 stakedForBlocks = (_currentTime - stakers[_address].timeStamp) / rewardPeriod;
        return stakers[_address].amount * stakedForBlocks * percentPerPeriod / 1000;
    }
}