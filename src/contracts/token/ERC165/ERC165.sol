// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/utils/introspection/IERC165.sol';

contract ERC165 is IERC165 {
  mapping(bytes4 => bool) private supportedInterfaces;

  constructor() {
    _registerInterface(calcFingerPrint('supportsInterface(bytes4)'));
  }

  function supportsInterface(bytes4 interfaceId) external view override returns (bool) {
    return supportedInterfaces[interfaceId];
  }

  function calcFingerPrint(bytes memory objectSign) public pure returns (bytes4) {
    return bytes4(keccak256(objectSign));
  }

  function _registerInterface(bytes4 interfaceId) public {
    require(interfaceId != 0xffffffff, 'ERC165: INVALID INTERFACE');
    supportedInterfaces[interfaceId] = true;
  }
}
