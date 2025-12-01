// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

interface IPayments {
  function withdrawAll(address _to) external;

  receive() external payable;
}
