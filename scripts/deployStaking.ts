import { SimpleToken, Staking } from '../typechain'
import { ethers } from 'hardhat'
import { BigNumber } from "ethers";

async function deployStaking() {
	const stakingTokenDeposit = BigNumber.from('5').pow('18').mul('10'); 
	const SimpleToken = await ethers.getContractFactory('SimpleToken')
	console.log('starting deploying token...')
	const token0 = await SimpleToken.deploy('TokenA', 'TKA') as SimpleToken
	console.log('SimpleToken deployed with address: ' + token0.address)

	const token1 = await SimpleToken.deploy('TokenB', 'TKB') as SimpleToken
	console.log('LiquidityToken deployed with address: ' + token1.address)

	const Staking = await ethers.getContractFactory('Staking')
	console.log('starting deploying staking...')
	const staking = await Staking.deploy(token0.address, token1.address, 86400, 1631489094, 1631737494, 10) as Staking
	console.log('Staking deployed with address: ' + staking.address)

	await token0.transfer(staking.address, stakingTokenDeposit);
}

deployStaking()
.then(() => process.exit(0))
.catch(error => {
	console.error(error)
	process.exit(1)
})
