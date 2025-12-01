// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import './ListingStoreLib.sol';
import '../../royalty/core/ERC2981MarketplaceLib.sol';
import '../../../security/signature/SignatureLib.sol';

interface IListings {
  function createListing(
    address _nft,
    uint256 _tokenId,
    uint256 _price,
    uint256 _value,
    SignatureLib.NonceRequest memory _nonce
  ) external payable;

  function deleteListing(address _nft, uint256 _tokenId) external;

  function updateListing(address _nft, uint256 _tokenId, uint256 _price, uint256 _value) external;

  function getListingCounter(address _nft) external view returns (uint256);

  function getListingByIndex(
    address _nft,
    uint256 _index
  ) external view returns (ListingStoreLib.ListNFT memory);

  function getListing(
    address _nft,
    uint256 _tokenId
  ) external view returns (ListingStoreLib.ListNFT memory);

  function getListingPriceWithRoyalties(
    address _nft,
    uint256 _tokenId,
    uint256 _value,
    SignatureLib.NonceRequest memory _nonce
  ) external view returns (uint256);

  function purchaseItem(
    address _nft,
    uint256 _tokenId,
    uint256 _value,
    SignatureLib.NonceRequest memory _nonce
  ) external payable;
}
