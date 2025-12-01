// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

interface IAuction {
  function createAuction(
    address _nft,
    uint256 _tokenId,
    address _payToken,
    uint256 _price,
    uint256 _minBid,
    uint256 _startTime,
    uint256 _endTime
  ) external;

  function cancelAuction(address _nft, uint256 _tokenId) external;

  function bidPlace(address _nft, uint256 _token, uint256 _bidPrice) external;

  function resultAuction(address _nft, uint256 _tokenId) external;
}

