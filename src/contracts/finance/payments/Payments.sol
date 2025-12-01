// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import '@openzeppelin/contracts/access/Ownable.sol';

import './IPayments.sol';
import './PaymentsLib.sol';

contract Payments is IPayments, Ownable {
  function withdrawAll(address _to) public override onlyOwner {
    (bool success, ) = payable(_to).call{value: address(this).balance}('');

    if (!success) {
      revert PaymentsLib.NotPayed();
    }
  }

  function _withdraw(address _to, uint256 _amount) internal {
    (bool success, ) = payable(_to).call{value: _amount}('');

    if (!success) {
      revert PaymentsLib.NotPayed();
    }
  }

  receive() external payable override {}
}
