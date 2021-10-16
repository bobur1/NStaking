import { ethers} from 'hardhat';
import chai from 'chai';
import { ContractFactory, Contract, BigNumber } from 'ethers';
import chaiAsPromised from 'chai-as-promised';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('SimpleToken', () => {
	let SimpleToken:ContractFactory;
	let SimpleTokenInstance:Contract;
	let owner:SignerWithAddress;
	let addr1:SignerWithAddress;
	let addr2:SignerWithAddress;
	let addrs:Array<SignerWithAddress>;
	const depositTotal = BigNumber.from('10').pow('18').mul('10');

	before(async function () {
		[owner, addr1, addr2, ...addrs] = await ethers.getSigners();
		SimpleToken = await ethers.getContractFactory('SimpleToken');
	});

	beforeEach(async function () {
		SimpleTokenInstance = await SimpleToken.deploy("Token A", "TKA");
		await SimpleTokenInstance.deployed();
	});

	describe('Transactions', function () {
		const transferAmount = BigNumber.from('10').pow('18').mul('5');
		
		it('Should transfer tokens between accounts', async function () {
			await SimpleTokenInstance.transfer(addr1.address, transferAmount);
			const addr1Balance = await SimpleTokenInstance.balanceOf(addr1.address);
			expect(addr1Balance).to.equal(transferAmount);

			await SimpleTokenInstance.connect(addr1).transfer(addr2.address, transferAmount);
			const addr2Balance = await SimpleTokenInstance.balanceOf(addr2.address);
			expect(addr2Balance).to.equal(transferAmount);
		});

		it('Should fail if sender doesn’t have enough tokens', async function () {
			const initialOwnerBalance = await SimpleTokenInstance.balanceOf(owner.address);

			await expect(SimpleTokenInstance.connect(addr1).transfer(owner.address, BigNumber.from('10').pow('18').mul('1')))
			.to.be.revertedWith('ERC20: transfer amount exceeds balance');
			expect(await SimpleTokenInstance.balanceOf(owner.address)).to.equal(initialOwnerBalance);
		});
		
		it('Should update balances after transfers', async function () {
			const initialOwnerBalance = await SimpleTokenInstance.balanceOf(owner.address);

			await SimpleTokenInstance.transfer(addr1.address, BigNumber.from('100'));
			await SimpleTokenInstance.transfer(addr2.address, BigNumber.from('50'));

			const finalOwnerBalance = await SimpleTokenInstance.balanceOf(owner.address);
			expect(finalOwnerBalance).to.equal(BigNumber.from(initialOwnerBalance).sub('150'));

			const addr1Balance = await SimpleTokenInstance.balanceOf(addr1.address);
			expect(addr1Balance).to.equal(BigNumber.from('100'));

			const addr2Balance = await SimpleTokenInstance.balanceOf(addr2.address);
			expect(addr2Balance).to.equal(BigNumber.from('50'));
		});
	});
});
