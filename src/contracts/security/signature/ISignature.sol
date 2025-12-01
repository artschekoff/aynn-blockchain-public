// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

interface ISignature {
  function setGlobalAttestant(address _attestant) external;

  function getGlobalAttestant() external view returns (address);
}
