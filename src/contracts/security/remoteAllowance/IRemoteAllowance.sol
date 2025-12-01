// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

interface IRemoteAllowance {
  function setRemoteAllowance(address _address, bool _isAllowed) external;

  function isAllowed(address _address) external view returns (bool);
}
