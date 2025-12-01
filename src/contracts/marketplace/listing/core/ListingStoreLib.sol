// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

library ListingStoreLib {
  error NotListed(address _nft, uint256 _tokenId);
  error AlreadyListed(address _nft, uint256 _tokenId);
  error Sold(address _nft, uint256 _tokenId);

  struct ListNFT {
    address nft;
    uint256 tokenId;
    address payable seller;
    address payable owner;
    uint256 price;
    uint256 value;
    bool sold;
  }
}
