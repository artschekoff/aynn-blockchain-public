// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import './SignatureLib.sol';
import './Signature.sol';

contract SignatureTestContract is Signature {
  function isValidNonceRequest(
    SignatureLib.NonceRequest memory _attestationRequest
  ) public view returns (bool) {
    return _isValidNonceRequest(_attestationRequest);
  }

  function isValidSignature(
    address attestor,
    bytes32 ethSignedMessageHash,
    bytes memory signature
  ) public pure returns (bool) {
    return _isValidSignature(attestor, ethSignedMessageHash, signature);
  }
}
