// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8;

import "./ERC20.sol";

contract SimpleToken is ERC20 {
    /**
      * @notice SimpleToken is a token based on simplified ERC20
      * @dev SimpleToken is simple ERC20 which mint tokens when you deploy this contract
      * @param _name is name
      * @param _symbol is symbol
      */
    constructor(string memory _name, string memory _symbol) ERC20(_name, _symbol) {
        _mint(msg.sender, 100 * 10 ** 18);
    }
}