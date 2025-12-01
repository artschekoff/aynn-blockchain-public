// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import './TransmitterLib.sol';
import './ITransmitter.sol';

interface ITransmitterController is ITransmitter {
  function setTransmitterAddress(TransmitterLib.TransmitterType _type, address _address) external;

  function getTransmitterAddress(
    TransmitterLib.TransmitterType _type
  ) external view returns (address);

  function isSingularItem(address _nft) external view returns (bool);
}
