// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import './ListingStoreLib.sol';

interface IListingStore {
  function createListing(
    address _nft,
    uint256 _tokenId,
    address _seller,
    uint256 _price,
    uint256 _value
  ) external;

  function deleteListing(address _nft, uint256 _tokenId) external;

  function updateListing(
    address _nft,
    uint256 _tokenId,
    ListingStoreLib.ListNFT memory _listing
  ) external;

  function getListingCounter(address _nft) external view returns (uint256);

  function getListing(
    address _nft,
    uint256 _tokenId
  ) external view returns (ListingStoreLib.ListNFT memory);

  function getListingByIndex(
    address _nft,
    uint256 _index
  ) external view returns (ListingStoreLib.ListNFT memory);
}
