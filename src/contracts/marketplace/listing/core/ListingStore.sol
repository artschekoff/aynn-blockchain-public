// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import '../../store/core/StoreConnector.sol';
import './ListingStoreLib.sol';
import './IListingStore.sol';

contract ListingStore is StoreConnector, IListingStore {
  ////////////////////////////////////
  /// @notice area VARIABLES
  ////////////////////////////////////

  // itemId -> Item
  mapping(address => ListingStoreLib.ListNFT[]) private _allListings;

  // address => 0 -> tokenId = 12
  // address => 1 -> tokenId = 1
  // ...etc
  // nft => [index] => tokenId
  mapping(address => mapping(uint256 => uint256)) private _collectionTokenIndexes;

  ////////////////////////////////////
  /// @notice area CORE
  ////////////////////////////////////
  function deleteListing(
    address _nft,
    uint256 _tokenId
  ) external override IsRemoteAllowed(msg.sender) {
    uint256 lastTokenIndex = _allListings[_nft].length - 1;
    uint256 tokenIndex = _collectionTokenIndexes[_nft][_tokenId];

    ListingStoreLib.ListNFT memory lastListing = _allListings[_nft][lastTokenIndex];

    _allListings[_nft][tokenIndex] = lastListing;
    _collectionTokenIndexes[_nft][lastListing.tokenId] = tokenIndex;

    delete (_collectionTokenIndexes[_nft][_tokenId]);
    _allListings[_nft].pop();
  }

  function updateListing(
    address _nft,
    uint256 _tokenId,
    ListingStoreLib.ListNFT memory _listing
  ) external override IsRemoteAllowed(msg.sender) {
    uint256 tokenIndex = _collectionTokenIndexes[_nft][_tokenId];

    _allListings[_nft][tokenIndex].price = _listing.price;
    _allListings[_nft][tokenIndex].value = _listing.value;
    _allListings[_nft][tokenIndex].sold = _listing.sold;
    _allListings[_nft][tokenIndex].owner = _listing.owner;
  }

  function createListing(
    address _nft,
    uint256 _tokenId,
    address _seller,
    uint256 _price,
    uint256 _value
  ) external override IsRemoteAllowed(msg.sender) {
    // console.log("createListing:", _allListings[_nft].length, _collection);

    // to be able to maintain mapping, we should ignore zero-elements
    if (_allListings[_nft].length == 0) {
      _allListings[_nft].push(
        ListingStoreLib.ListNFT(
          address(0),
          0,
          payable(address(0)),
          payable(address(0)),
          0,
          0,
          false
        )
      );
    }

    _collectionTokenIndexes[_nft][_tokenId] = _allListings[_nft].length;

    // console.log('create listing: index for token ', _tokenId, ' is ', _allListings[_nft].length);

    _allListings[_nft].push(
      ListingStoreLib.ListNFT(
        _nft,
        _tokenId,
        // seller
        payable(_seller),
        // owner
        payable(address(this)),
        _price,
        _value,
        false
      )
    );
  }

  function getListing(
    address _nft,
    uint256 _tokenId
  ) external view override IsRemoteAllowed(msg.sender) returns (ListingStoreLib.ListNFT memory) {
    uint256 tokenIndex = _collectionTokenIndexes[_nft][_tokenId];

    // console.log('getListing: index for token ', _tokenId, ' is ', tokenIndex);

    // console.log('getListing:', _nft, _tokenId, tokenIndex);

    // if item does not exist = return empty element
    if (tokenIndex == 0) {
      return
        ListingStoreLib.ListNFT(
          address(0),
          0,
          payable(address(0)),
          payable(address(0)),
          0,
          0,
          false
        );
    } else {
      return _allListings[_nft][tokenIndex];
    }
  }

  ////////////////////////////////////
  /// @notice area UTILITIES
  ////////////////////////////////////
  function getListingCounter(
    address _nft
  ) external view override IsRemoteAllowed(msg.sender) returns (uint256) {
    // -1 for zero empty-element
    return _allListings[_nft].length == 0 ? 0 : _allListings[_nft].length - 1;
  }

  function getListingByIndex(
    address _nft,
    uint256 _index
  ) external view override IsRemoteAllowed(msg.sender) returns (ListingStoreLib.ListNFT memory) {
    return _allListings[_nft][_index + 1];
  }
}
