import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ethers, network } from 'hardhat';
import { expect, assert } from 'chai';
import { BigNumber, ContractTransaction, ContractReceipt } from "ethers";

import Web3 from 'web3';
import { Staking, SimpleToken} from '../typechain';

// @ts-ignore
const web3 = new Web3(network.provider) as Web3;

describe('Contract: Staking', () => {
    const depositTotal = BigNumber.from(10).pow(18).mul(100);
    const stakingTokenDeposit = depositTotal.div(2);
    // new reward period in sec
    const newPeriod = BigNumber.from(1);
    const user0Deposit = BigNumber.from(10).pow(18).mul(10);

    // start time for staker
    let startTime = BigNumber.from(0);

    // delay between start and end of contract in sec
    let delayTime = 60;

    // start time for staking contract
    let stackingStartTimestamp = BigNumber.from(Date.now()).div(1000);
    let stackingEndTimestamp = stackingStartTimestamp.add(delayTime);

    // reward 1%
    let rewardPercent = BigNumber.from(10);

    let simpleToken: SimpleToken;
    let liquidityToken: SimpleToken;
    let staking: Staking;

    let owner: SignerWithAddress;
    let user0: SignerWithAddress;
    let user1: SignerWithAddress;

    beforeEach(async () => {
		[owner, user0, user1] = await ethers.getSigners();
        let SimpleToken = await ethers.getContractFactory('SimpleToken');
        let Staking = await ethers.getContractFactory('Staking');

        simpleToken = await SimpleToken.deploy('Token A', 'TKA') as SimpleToken;
        liquidityToken = await SimpleToken.deploy('Token B', 'TKB') as SimpleToken;
        staking = await Staking.deploy(simpleToken.address, liquidityToken.address, newPeriod, stackingStartTimestamp, stackingEndTimestamp, rewardPercent) as Staking;

        // we need some tokens to be transfered to the staking in order to provide any rewards
        liquidityToken.transfer(staking.address, stakingTokenDeposit);
	});

    describe('Deployment', () => {
		it('Chech staking token balance', async () => {
            expect(await liquidityToken.balanceOf(staking.address)).to.equal(stakingTokenDeposit);
            expect(await liquidityToken.balanceOf(owner.address)).to.equal(depositTotal.sub(stakingTokenDeposit));
		});
    });

	describe('Owner side functions checking', () => {
		it('Change percent per block', async () => {
			const newPercent = BigNumber.from('10');

            // checking event trigger
            expect(await staking.setPercentPerPeriod(newPercent)).to.emit(staking, 'LogOwnerAction')
            .withArgs(0, newPercent);
            
            expect(await staking.percentPerPeriod()).to.equal(newPercent);
		});

		it('Change reward period in seconds', async () => {
			const newPeriod = BigNumber.from('3600');

            expect(await staking.setRewardPeriod(newPeriod)).to.emit(staking, 'LogOwnerAction')
            .withArgs(1, newPeriod);
            
            expect(await staking.rewardPeriod()).to.equal(newPeriod);
		});

		it('Withdraw all tokens from staking', async () => {
            await staking.withdraw(stakingTokenDeposit, liquidityToken.address);
            expect(await simpleToken.balanceOf(owner.address)).to.equal(depositTotal);
		});
	});

    describe('User side functions checking', () => {
        beforeEach(async () => {
            await simpleToken.transfer(user0.address, user0Deposit);

            // need to approve staking contract to use user's tokens
            // we are approving to use more than user has and there are no mistakes
            await simpleToken.connect(user0).approve(staking.address, depositTotal);
            await staking.connect(user0).stakeTokens(user0Deposit);
            
            let staker = await staking.stakers(user0.address);
            startTime = staker['timeStamp'];
        });

		it('Check Stake tokens', async () => {
            let staker = await staking.stakers(user0.address);
            expect(staker['amount']).to.equal(user0Deposit);
            expect(startTime).to.above(0);
		});

		// it('Unstake tokens', async () => {
        //     await sleep(10);
        //     await staking.connect(user0).unstakeTokens();
            
        //     const stopTime = await staking.endTimestamp();
        //     // same calculation as rewardAmountCounter in contract
        //     let rewardAmount = stopTime.sub(startTime).div(newPeriod)
        //     .mul(user0Deposit).mul(rewardPercent).div(1000);
            
        //     expect(await simpleToken.balanceOf(user0.address)).to.equal(user0Deposit);
        //     expect(await liquidityToken.balanceOf(user0.address)).to.equal(rewardAmount);
		// });

		it('Claim rewards', async () => {
            await new Promise(res => setTimeout(() => res(null), 5000));
            await sleep(8);

            // event listener from https://stackoverflow.com/questions/68432609/contract-event-listener-is-not-firing-when-running-hardhat-tests-with-ethers-js
            const contractTx: ContractTransaction = await staking.connect(user0).claimReward();
            const contractReceipt: ContractReceipt = await contractTx.wait();
            const event = contractReceipt.events?.find(event => event.event === 'LogPayout');
            const stopTime: BigNumber = event?.args!['timeStamp'];
            
            let reward = stopTime.sub(startTime).div(newPeriod)
            .mul(user0Deposit).mul(rewardPercent).div(1000);

            expect(await liquidityToken.balanceOf(user0.address)).to.equal(reward);
		});

		// it('Stake token without claiming and unstaking', async () => {
        //     await sleep(4);

        //     const contractTx: ContractTransaction = await staking.connect(user0).stakeTokens(user0Deposit);
        //     const contractReceipt: ContractReceipt = await contractTx.wait();
        //     const event = contractReceipt.events?.find(event => event.event === 'LogPayout');
        //     const stopTime: BigNumber = event?.args!['timeStamp'];

        //     await sleep(6);

        //     let reward = stopTime.sub(startTime).div(newPeriod)
        //     .mul(user0Deposit).mul(rewardPercent).div(1000);

        //     let staker = await staking.stakers(user0.address);

        //     expect(staker['reward']).to.equal(reward);
		// });
    });
});

function sleep(sec: number) {
    return new Promise(resolve => setTimeout(resolve, sec * 1000));
}