// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import './OfferStoreLib.sol';

interface IOfferStore {
  function createOffer(
    address _nft,
    uint256 _tokenId,
    address _offerer,
    uint256 _price,
    uint256 _value
  ) external;

  function deleteOffer(address _nft, uint256 _tokenId, address payable _offerer) external;

  function updateOffer(
    address _nft,
    uint256 _tokenId,
    address _offerer,
    OfferStoreLib.OfferNFT memory _offer
  ) external;

  function getOfferCounter(address _nft, uint256 _tokenId) external view returns (uint256);

  function getOfferByIndex(
    address _nft,
    uint256 _tokenId,
    uint256 _index
  ) external view returns (OfferStoreLib.OfferNFT memory);

  function getOffer(
    address _nft,
    uint256 _tokenId,
    address _offerer
  ) external view returns (OfferStoreLib.OfferNFT memory);
}
