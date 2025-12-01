// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

library SignatureLib {
  struct NonceRequest {
    address signer;
    bytes signature;
    uint256 nonce;
    uint32 validTill;
  }

  struct EIP721Signature {
    address signer;
    bytes signature;
    // uint8 v;
    // bytes32 r;
    // bytes32 s;
  }
}
