// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

interface IPause {
  function setPaused(bool _value) external;

  function getPaused() external view returns (bool);
}
