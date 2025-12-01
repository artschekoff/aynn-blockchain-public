// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

import './SignatureLib.sol';
import './ISignature.sol';

contract Signature is Ownable, ISignature {
  using ECDSA for bytes32;
  error InvalidSignature();

  address internal _globalAttestant;

  function setGlobalAttestant(address _attestant) external override onlyOwner {
    _globalAttestant = _attestant;
  }

  function getGlobalAttestant() external view override returns (address) {
    return _globalAttestant;
  }

  function _isValidNonceRequest(
    SignatureLib.NonceRequest memory _attestationRequest
  ) internal view returns (bool) {
    bytes32 messageHash = keccak256(
      abi.encodePacked(
        _attestationRequest.signer,
        _attestationRequest.nonce,
        _attestationRequest.validTill
      )
    );

    bytes32 ethSignedMessageHash = ECDSA.toEthSignedMessageHash(messageHash);

    bool isValid = _isValidSignature(
      _attestationRequest.signer,
      ethSignedMessageHash,
      _attestationRequest.signature
      // _signature.v,
      // _signature.r,
      // _signature.s
    );

    if (isValid) {
      isValid = _isValidTill(_attestationRequest.validTill);
    }

    return isValid;
  }

  function _isValidTill(uint256 _validTill) internal view returns (bool) {
    return _validTill > block.timestamp;
  }

  function _isValidSignature(
    address _attestor,
    bytes32 _ethSignedMessageHash,
    bytes memory _signature
  )
    internal
    pure
    returns (
      // uint8 v,
      // bytes32 r,
      // bytes32 s
      bool
    )
  {
    // address signer = ECDSA.recover(ethSignedMessageHash, v, r, s);
    address signer = ECDSA.recover(_ethSignedMessageHash, _signature);
    return signer == _attestor;
    // if (signer != attestor) revert InvalidSignature();
  }
}
