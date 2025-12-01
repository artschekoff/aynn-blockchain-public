// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

interface IMultiCurrency {
  function checkIsPayableToken(address _payableToken) external view returns (bool);

  function setPayableToken(address _token, bool _value) external;
}
