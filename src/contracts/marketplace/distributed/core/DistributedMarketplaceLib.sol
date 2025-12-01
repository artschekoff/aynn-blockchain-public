// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

library DistributedMarketplaceLib {
  ////////////////////////////////////
  /// @notice area STRUCTURES
  ////////////////////////////////////
  enum UnitRole {
    LISTING,
    OFFER,
    TRANSMITTER,
    MARKETPLACE
  }

  ////////////////////////////////////
  /// @notice area ERRORS
  ////////////////////////////////////
  error PriceNotMet(address _nft, uint256 _tokenId, uint256 _price);
  error SellerCannotBuy(address _nft, uint256 _tokenId);
  error NoProceeds();
  error NotOwner();
  error PriceMustBeAboveZero();

  ////////////////////////////////////
  /// @notice area EVENTS
  ////////////////////////////////////
  event ListingCreated(
    address indexed nft,
    uint256 tokenId,
    uint256 price,
    uint256 value,
    address indexed seller
  );

  event ListingPurchased(
    address indexed nft,
    uint256 tokenId,
    uint256 price,
    uint256 value,
    address indexed seller,
    address indexed owner
  );

  event ListingDeleted(address indexed nft, uint256 indexed tokenId, address indexed seller);

  event OfferCreated(
    address indexed nft,
    uint256 indexed tokenId,
    uint256 price,
    uint256 value,
    address indexed offerer
  );

  event OfferDeleted(
    address indexed nft,
    uint256 indexed tokenId,
    uint256 price,
    uint256 value,
    address indexed offerer
  );

  event OfferAccepted(
    address indexed nft,
    uint256 indexed tokenId,
    uint256 price,
    uint256 value,
    address offerer,
    address indexed nftOwner
  );
}
