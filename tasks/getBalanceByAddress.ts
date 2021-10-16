import { task } from 'hardhat/config'
import BigNumber from "bignumber.js"

task('getBalanceByAddress', 'Get balance by address of token and address of user')
	.addParam('token', 'Token address')
	.addParam('user', 'User address')
	.setAction(async ({ token, user}, { ethers }) => {
		const contract = await ethers.getContractAt('ERC20', token)
		const [
			balance,
			decimals,
			symbol,
		] = await Promise.all([
			(await contract.balanceOf(user)).toString(),
			(await contract.decimals()).toString(),
			await contract.symbol(),
		])
		console.log(`Balance: ${balance} ${symbol}`)
		console.log(`Or without decimals: ${new BigNumber(balance).shiftedBy(-decimals).toString()} ${symbol}`)
	})
