// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import '@openzeppelin/contracts/access/Ownable.sol';
import './IMultiCurrency.sol';

abstract contract MultiCurrency is IMultiCurrency, Ownable {
  // address[] internal s_tokens;
  mapping(address => bool) internal s_payableToken;

  constructor() {
    // FTM (Fantom)
    s_payableToken[0x4E15361FD6b4BB609Fa63C81A2be19d873717870] = true;

    // WETH (wrapped eth)
    s_payableToken[0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2] = true;

    // BNB (binance)
    s_payableToken[0xB8c77482e45F1F44dE1745F52C74426C631bDD52] = true;

    // Sepolia
    s_payableToken[0x9e4DDa001b1f490A244fb3b24CeB07A570ACf44b] = true;
  }

  function isPayableToken(address _token) public view returns(bool) {
    return(_token != address(0) && s_payableToken[_token]);
  }

  function checkIsPayableToken(address _token) override external view returns (bool) {
    return s_payableToken[_token];
  }

  function setPayableToken(address _token, bool _value) external override onlyOwner {
    require(_token != address(0), 'invalid token');
    s_payableToken[_token] = _value;
  }
}
