// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

library OfferStoreLib {
  error NotOffered(address _nft, uint256 _tokenId, address _offerer);
  error AlreadyOffered(address _nft, uint256 _tokenId, address _offerer);
  error AlreadyAccepted(address _nft, uint256 _tokenId);

  struct OfferNFT {
    address nft;
    uint256 tokenId;
    address offerer;
    uint256 price;
    uint256 value;
    bool accepted;
  }
}
