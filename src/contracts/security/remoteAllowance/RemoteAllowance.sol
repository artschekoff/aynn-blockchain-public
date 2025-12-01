// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import './RemoteAllowanceLib.sol';
import './IRemoteAllowance.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

contract RemoteAllowance is IRemoteAllowance, Ownable {
  mapping(address => bool) _allowances;

  modifier IsRemoteAllowed(address _address) {
    if (_allowances[_address] != true) {
      revert RemoteAllowanceLib.RemoteNotAllowed();
    }
    _;
  }

  function setRemoteAllowance(address _address, bool _isAllowed) external override onlyOwner {
    _allowances[_address] = _isAllowed;
  }

  function isAllowed(address _address) external view override returns (bool) {
    return _allowances[_address] || owner() == msg.sender;
  }
}
