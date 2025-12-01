// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import '@openzeppelin/contracts/access/Ownable.sol';

import './IPause.sol';
import './PauseLib.sol';

contract Pause is Ownable, IPause {
  bool private s_paused;

  modifier notPaused() {
    if (s_paused) {
      revert PauseLib.Paused();
    }
    _;
  }

  function setPaused(bool _value) external override onlyOwner {
    s_paused = _value;
  }

  function getPaused() public view override returns (bool) {
    return s_paused;
  }
}
