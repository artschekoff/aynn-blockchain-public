// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import './OfferStoreLib.sol';
import '../../royalty/core/ERC2981MarketplaceLib.sol';
import '../../../security/signature/SignatureLib.sol';

interface IOffers {
  function createOffer(
    address _nft,
    uint256 _tokenId,
    uint256 _value,
    uint256 _price,
    SignatureLib.NonceRequest memory _nonce
  ) external payable;

  function acceptOffer(
    address _nft,
    uint256 _tokenId,
    address _offerer,
    SignatureLib.NonceRequest memory _nonce
  ) external payable;

  function deleteOffer(address _nft, uint256 _tokenId) external;

  function updateOffer(
    address _nft,
    uint256 _tokenId,
    uint256 _value,
    uint256 _price
  ) external payable;

  function getOfferCounter(address _nft, uint256 _tokenId) external view returns (uint256);

  function getOfferPriceWithRoyalties(
    address _nft,
    uint256 _tokenId,
    ERC2981MarketplaceLib.RoyaltyMeta memory _royaltyMeta
  ) external view returns (uint256);

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
