// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

interface ITransmitter {
  function safeTransferFrom(
    address _nft,
    uint256 _tokenId,
    uint256 _value,
    address _account,
    address _operator
  ) external;

  function isTokenOwner(
    address _nft,
    uint256 _tokenId,
    uint256 _value,
    address _operator
  ) external view returns (bool);

  function isTokenApproved(
    address _nft,
    address _account,
    address _operator,
    uint256 _tokenId
  ) external view returns (bool);

  function isTokenApprovedOwn(
    address _nft,
    address _account,
    uint256 _tokenId
  ) external view returns (bool);
}
