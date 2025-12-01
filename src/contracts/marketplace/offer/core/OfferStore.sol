// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import '../../store/core/StoreConnector.sol';
import './OfferStoreLib.sol';
import './IOfferStore.sol';

contract OfferStore is StoreConnector, IOfferStore {
  ////////////////////////////////////
  /// @notice area VARIABLES
  ////////////////////////////////////

  // nft => tokenId => offers
  mapping(address => mapping(uint256 => OfferStoreLib.OfferNFT[])) private _allOffers;

  // mapping(address => mapping(uint256 => uint256)) _collectionOfferIndexes;
  mapping(address => mapping(uint256 => mapping(address => uint256))) _collectionOffererIndexes;

  ////////////////////////////////////
  /// @notice area CORE
  ////////////////////////////////////
  function createOffer(
    address _nft,
    uint256 _tokenId,
    address _offerer,
    uint256 _price,
    uint256 _value
  ) external override IsRemoteAllowed(msg.sender) {
    // to be able to maintain mapping, we should ignore zero-elements
    if (_allOffers[_nft][_tokenId].length == 0) {
      _allOffers[_nft][_tokenId].push(
        OfferStoreLib.OfferNFT(address(0), 0, address(0), 0, 0, false)
      );
    }

    _collectionOffererIndexes[_nft][_tokenId][_offerer] = _allOffers[_nft][_tokenId].length;

    // console.log('create offer index is:', _allOffers[_nft][_tokenId].length);

    _allOffers[_nft][_tokenId].push(
      OfferStoreLib.OfferNFT(_nft, _tokenId, _offerer, _price, _value, false)
    );
  }

  function deleteOffer(
    address _nft,
    uint256 _tokenId,
    address payable _offerer
  ) external override IsRemoteAllowed(msg.sender) {
    uint256 lastTokenIndex = _allOffers[_nft][_tokenId].length - 1;

    uint256 itemIndex = _collectionOffererIndexes[_nft][_tokenId][_offerer];

    OfferStoreLib.OfferNFT memory lastOffer = _allOffers[_nft][_tokenId][lastTokenIndex];

    _allOffers[_nft][_tokenId][itemIndex] = lastOffer;

    _collectionOffererIndexes[_nft][lastOffer.tokenId][_offerer] = itemIndex;

    delete (_collectionOffererIndexes[_nft][_tokenId][_offerer]);

    _allOffers[_nft][_tokenId].pop();
  }

  function updateOffer(
    address _nft,
    uint256 _tokenId,
    address _offerer,
    OfferStoreLib.OfferNFT memory _offer
  ) external override IsRemoteAllowed(msg.sender) {
    uint256 itemIndex = _collectionOffererIndexes[_nft][_tokenId][_offerer];

    _allOffers[_nft][_tokenId][itemIndex].price = _offer.price;
    _allOffers[_nft][_tokenId][itemIndex].value = _offer.value;
    _allOffers[_nft][_tokenId][itemIndex].accepted = _offer.accepted;
  }

  function getOffer(
    address _nft,
    uint256 _tokenId,
    address _offerer
  ) external view override IsRemoteAllowed(msg.sender) returns (OfferStoreLib.OfferNFT memory) {
    uint256 itemIndex = _collectionOffererIndexes[_nft][_tokenId][_offerer];

    // console.log('get offer index is:', itemIndex);

    // if item does not exists = return empty element
    if (itemIndex == 0) {
      return OfferStoreLib.OfferNFT(address(0), 0, address(0), 0, 0, false);
    } else {
      return _allOffers[_nft][_tokenId][itemIndex];
    }
  }

  ////////////////////////////////////
  /// @notice area UTILITIES
  ////////////////////////////////////
  function getOfferCounter(
    address _nft,
    uint256 _tokenId
  ) external view override IsRemoteAllowed(msg.sender) returns (uint256) {
    return _allOffers[_nft][_tokenId].length == 0 ? 0 : _allOffers[_nft][_tokenId].length - 1;
  }

  function getOfferByIndex(
    address _nft,
    uint256 _tokenId,
    uint256 _index
  ) external view override IsRemoteAllowed(msg.sender) returns (OfferStoreLib.OfferNFT memory) {
    return _allOffers[_nft][_tokenId][_index + 1];
  }
}
