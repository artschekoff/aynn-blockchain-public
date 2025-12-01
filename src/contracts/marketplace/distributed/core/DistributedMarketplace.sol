// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

// distributed marketplace
import './IDistributedMarketplace.sol';
import './DistributedMarketplaceLib.sol';
import './DistributedMarketplaceConnector.sol';

import '../../royalty/core/ERC2981MarketplaceLib.sol';

// listings
import '../../listing/core/IListingStore.sol';
import '../../listing/core/ListingStoreLib.sol';

// offers
import '../../offer/core/IOfferStore.sol';
import '../../offer/core/OfferStoreLib.sol';

// transmitter
import '../../transmitter/core/ITransmitterController.sol';

import '../../../security/signature/SignatureLib.sol';

contract DistributedMarketplace is DistributedMarketplaceConnector, IDistributedMarketplace {
  mapping(DistributedMarketplaceLib.UnitRole => address) private s_units;

  function _getTransmitter() internal view returns (ITransmitterController) {
    return ITransmitterController(s_units[DistributedMarketplaceLib.UnitRole.TRANSMITTER]);
  }

  function _getListingStore() internal view returns (IListingStore) {
    return IListingStore(s_units[DistributedMarketplaceLib.UnitRole.LISTING]);
  }

  function _getOfferStore() internal view returns (IOfferStore) {
    return IOfferStore(s_units[DistributedMarketplaceLib.UnitRole.OFFER]);
  }

  ////////////////////////////////////
  /// @notice area MODIFIERS
  ////////////////////////////////////
  modifier isListed(address _nft, uint256 _tokenId) {
    if (_getListingStore().getListing(_nft, _tokenId).price <= 0) {
      revert ListingStoreLib.NotListed(_nft, _tokenId);
    }
    _;
  }

  modifier notSold(address _nft, uint256 _tokenId) {
    if (_getListingStore().getListing(_nft, _tokenId).sold) {
      revert ListingStoreLib.Sold(_nft, _tokenId);
    }
    _;
  }

  modifier notListed(address _nft, uint256 _tokenId) {
    if (_getListingStore().getListing(_nft, _tokenId).price > 0) {
      revert ListingStoreLib.AlreadyListed(_nft, _tokenId);
    }
    _;
  }

  modifier isOffered(
    address _nft,
    uint256 _tokenId,
    address _offerer
  ) {
    if (_getOfferStore().getOffer(_nft, _tokenId, payable(_offerer)).offerer == address(0)) {
      revert OfferStoreLib.NotOffered(_nft, _tokenId, _offerer);
    }
    _;
  }

  ////////////////////////////////////
  /// @notice area DISRTIBUTEDMARKETPLACE
  ////////////////////////////////////

  constructor(
    address _royaltyRecipient,
    uint256 _royaltyFeePercent,
    uint256 _royaltyFeeListing,
    uint256 _royaltyFeeOffer
  ) {
    _setRoyalties(_royaltyRecipient, ERC2981MarketplaceLib.RoyaltyType.PERCENT, _royaltyFeePercent);
    _setRoyalties(_royaltyRecipient, ERC2981MarketplaceLib.RoyaltyType.LISTING, _royaltyFeeListing);
    _setRoyalties(_royaltyRecipient, ERC2981MarketplaceLib.RoyaltyType.OFFER, _royaltyFeeOffer);
  }

  function setUnitAddress(
    DistributedMarketplaceLib.UnitRole _unitRole,
    address _address
  ) external override onlyOwner {
    s_units[_unitRole] = _address;
  }

  function getUnitAddress(
    DistributedMarketplaceLib.UnitRole _unitRole
  ) external view override onlyOwner returns (address) {
    return s_units[_unitRole];
  }

  ////////////////////////////////////
  /// @notice area ILISTINGS
  ////////////////////////////////////

  function createListing(
    address _nft,
    uint256 _tokenId,
    uint256 _price,
    uint256 _value,
    SignatureLib.NonceRequest memory _nonce
  ) external payable override notPaused nonReentrant {
    if (!_getTransmitter().isTokenOwner(_nft, _tokenId, _value, msg.sender)) {
      revert DistributedMarketplaceLib.NotOwner();
    }

    if (_price <= 0) {
      revert DistributedMarketplaceLib.PriceMustBeAboveZero();
    }

    ListingStoreLib.ListNFT memory listing = _getListingStore().getListing(_nft, _tokenId);

    // console.log('found listing', listing.tokenId, ' sould be ', _tokenId);

    if (listing.price > 0 && !listing.sold) {
      revert ListingStoreLib.AlreadyListed(_nft, _tokenId);
    }

    ERC2981MarketplaceLib.RoyaltyMeta memory royaltyMeta = ERC2981MarketplaceLib.RoyaltyMeta(
      ERC2981MarketplaceLib.RoyaltyType.LISTING,
      _price,
      _value,
      _nonce
    );

    (, uint256 listingFee) = royaltyInfo(royaltyMeta);

    if (msg.value < listingFee) {
      revert DistributedMarketplaceLib.PriceNotMet(_nft, _tokenId, _price);
    }

    if (!_getTransmitter().isTokenApprovedOwn(_nft, msg.sender, _tokenId)) {
      revert TransmitterLib.NotApprovedForMarketplace();
    }

    // sending money to seller
    _transferMarketplaceRoyalty(royaltyMeta);

    _getListingStore().createListing(_nft, _tokenId, msg.sender, _price, _value);

    emit DistributedMarketplaceLib.ListingCreated(_nft, _tokenId, _price, _value, msg.sender);
  }

  function deleteListing(
    address _nft,
    uint256 _tokenId
  ) external override notPaused isListed(_nft, _tokenId) nonReentrant {
    if (!_getTransmitter().isTokenOwner(_nft, _tokenId, 1, msg.sender)) {
      revert DistributedMarketplaceLib.NotOwner();
    }

    _getListingStore().deleteListing(_nft, _tokenId);

    emit DistributedMarketplaceLib.ListingDeleted(_nft, _tokenId, msg.sender);
  }

  function updateListing(
    address _nft,
    uint256 _tokenId,
    uint256 _price,
    uint256 _value
  ) external override notPaused nonReentrant {
    if (!_getTransmitter().isTokenOwner(_nft, _tokenId, 1, msg.sender)) {
      revert DistributedMarketplaceLib.NotOwner();
    }

    ListingStoreLib.ListNFT memory listing = _getListingStore().getListing(_nft, _tokenId);

    if (listing.price <= 0) {
      revert ListingStoreLib.NotListed(_nft, _tokenId);
    }

    listing.price = _price;
    listing.value = _value;

    _getListingStore().updateListing(_nft, _tokenId, listing);

    emit DistributedMarketplaceLib.ListingCreated(_nft, _tokenId, _price, _value, msg.sender);
  }

  function getListingCounter(address _nft) external view override returns (uint256) {
    return _getListingStore().getListingCounter(_nft);
  }

  function getListingByIndex(
    address _nft,
    uint256 _index
  ) external view override returns (ListingStoreLib.ListNFT memory) {
    return _getListingStore().getListingByIndex(_nft, _index);
  }

  function getListing(
    address _nft,
    uint256 _tokenId
  ) external view override returns (ListingStoreLib.ListNFT memory) {
    return _getListingStore().getListing(_nft, _tokenId);
  }

  function getListingPriceWithRoyalties(
    address _nft,
    uint256 _tokenId,
    uint256 _value,
    SignatureLib.NonceRequest memory _nonce
  ) external view override returns (uint256) {
    ListingStoreLib.ListNFT memory listing = _getListingStore().getListing(_nft, _tokenId);

    if (listing.price <= 0) {
      revert ListingStoreLib.NotListed(_nft, _tokenId);
    }

    return
      _getPriceWithRoyalties(
        _nft,
        listing.tokenId,
        ERC2981MarketplaceLib.RoyaltyMeta(
          ERC2981MarketplaceLib.RoyaltyType.PERCENT,
          listing.price,
          _value,
          _nonce
        ),
        ERC2981MarketplaceLib.RoyaltyAction.PLUS
      );
  }

  function purchaseItem(
    address _nft,
    uint256 _tokenId,
    uint256 _value,
    SignatureLib.NonceRequest memory _nonce
  ) external payable override notPaused nonReentrant {
    ListingStoreLib.ListNFT memory listing = _getListingStore().getListing(_nft, _tokenId);

    ERC2981MarketplaceLib.RoyaltyMeta memory royaltyMeta = ERC2981MarketplaceLib.RoyaltyMeta(
      ERC2981MarketplaceLib.RoyaltyType.PERCENT,
      listing.price,
      _value,
      _nonce
    );

    uint256 totalPrice = _getPriceWithRoyalties(
      _nft,
      listing.tokenId,
      royaltyMeta,
      ERC2981MarketplaceLib.RoyaltyAction.PLUS
    );

    if (msg.value < totalPrice) {
      revert DistributedMarketplaceLib.PriceNotMet(_nft, _tokenId, listing.price);
    }

    if (listing.seller == msg.sender) {
      revert DistributedMarketplaceLib.SellerCannotBuy(_nft, _tokenId);
    }

    if (listing.value < _value) {
      revert ListingStoreLib.Sold(_nft, _tokenId);
    }

    // transferring marketplace royalties
    _transferMarketplaceRoyalty(royaltyMeta);

    // transferring contract royalties (ERC2981 standart)
    _transferERC2981Royalties(listing.nft, _tokenId, listing.price, _value);

    // sending money to seller
    _withdraw(listing.seller, listing.price * _value);

    // transferring contract to buyer
    _getTransmitter().safeTransferFrom(_nft, _tokenId, _value, listing.seller, msg.sender);

    _syncAfterPurchaseListing(listing, _value, msg.sender);

    emit DistributedMarketplaceLib.ListingPurchased(
      _nft,
      _tokenId,
      listing.price,
      _value,
      listing.seller,
      msg.sender
    );
  }

  ////////////////////////////////////
  /// @notice area IOFFERS
  ////////////////////////////////////

  // calculate for:
  // * creation
  // * buy
  function getOfferPriceWithRoyalties(
    address _nft,
    uint256 _tokenId,
    ERC2981MarketplaceLib.RoyaltyMeta memory _royaltyMeta
  ) public view override returns (uint256) {
    uint256 totalPrice = 0;
    // on creation we calculate value for making (creation fee)
    // also offerer should send full amount of money for holding
    if (_royaltyMeta.royaltyType == ERC2981MarketplaceLib.RoyaltyType.PERCENT) {
      // on percent - we should calculate value that will be received by seller
      // total price - marketplace selling fee - erc2891 of contract (if supported)
      totalPrice = _getPriceWithRoyalties(
        _nft,
        _tokenId,
        _royaltyMeta,
        ERC2981MarketplaceLib.RoyaltyAction.MINUS
      );
    } else if (_royaltyMeta.royaltyType == ERC2981MarketplaceLib.RoyaltyType.OFFER) {
      (, uint256 marketplaceFee) = royaltyInfo(_royaltyMeta);
      totalPrice = _royaltyMeta.value * _royaltyMeta.price + marketplaceFee;
    } else {
      // else - revert with error
      revert ERC2981MarketplaceLib.RoyaltiesError();
    }

    return totalPrice;
  }

  // should send (_price * _value) + marketplace offer fee
  function createOffer(
    address _nft,
    uint256 _tokenId,
    uint256 _price,
    uint256 _value,
    SignatureLib.NonceRequest memory _nonce
  ) external payable override notPaused nonReentrant {
    if (_price <= 0) {
      revert DistributedMarketplaceLib.PriceMustBeAboveZero();
    }

    OfferStoreLib.OfferNFT memory offer = _getOfferStore().getOffer(_nft, _tokenId, msg.sender);

    if (offer.offerer == msg.sender) {
      revert OfferStoreLib.AlreadyOffered(_nft, _tokenId, msg.sender);
    }

    ListingStoreLib.ListNFT memory listing = _getListingStore().getListing(_nft, _tokenId);

    if (listing.seller == msg.sender) {
      revert DistributedMarketplaceLib.SellerCannotBuy(_nft, _tokenId);
    }

    if (listing.price <= 0 || listing.value < _value) {
      revert ListingStoreLib.NotListed(_nft, _tokenId);
    }

    if (listing.sold) {
      revert ListingStoreLib.Sold(_nft, _tokenId);
    }

    // get fee for making offer
    ERC2981MarketplaceLib.RoyaltyMeta memory createOfferRoyaltyMeta = ERC2981MarketplaceLib
      .RoyaltyMeta(ERC2981MarketplaceLib.RoyaltyType.OFFER, _price, _value, _nonce);

    uint256 totalOfferPrice = getOfferPriceWithRoyalties(_nft, _tokenId, createOfferRoyaltyMeta);

    // get percentage fee
    // uint256 totalSellingPrice = _getPriceWithRoyalties(_nft, _tokenId, createOfferRoyaltyMeta);

    // should pay create offer fee + send full amount price
    if (msg.value < totalOfferPrice) {
      revert DistributedMarketplaceLib.PriceNotMet(_nft, _tokenId, _price);
    }

    // transfer royalty for creating offer
    _transferMarketplaceRoyalty(createOfferRoyaltyMeta);

    // transfer remaining sum to marketplace for holding (already sent in message)
    _getOfferStore().createOffer(_nft, _tokenId, msg.sender, _price, _value);

    emit DistributedMarketplaceLib.OfferCreated(_nft, _tokenId, _price, _value, msg.sender);
  }

  function _syncAfterPurchaseListing(
    ListingStoreLib.ListNFT memory _listing,
    uint256 _soldAmount,
    address _buyer
  ) internal {
    _listing.value = _listing.value - _soldAmount;

    if (_listing.value == 0) {
      _listing.sold = true;
    }

    _listing.owner = payable(_buyer);

    _getListingStore().updateListing(_listing.nft, _listing.tokenId, _listing);
  }

  // acceptor receives price with minus percentage royalty
  function acceptOffer(
    address _nft,
    uint256 _tokenId,
    address _offerer,
    SignatureLib.NonceRequest memory _nonce
  ) external payable override notPaused nonReentrant {
    ListingStoreLib.ListNFT memory listing = _getListingStore().getListing(_nft, _tokenId);

    if (listing.price <= 0) {
      revert ListingStoreLib.NotListed(_nft, _tokenId);
    }

    if (listing.seller != msg.sender) {
      revert DistributedMarketplaceLib.NotOwner();
    }

    if (listing.seller == _offerer) {
      revert DistributedMarketplaceLib.SellerCannotBuy(_nft, _tokenId);
    }

    if (listing.sold) {
      revert ListingStoreLib.Sold(_nft, _tokenId);
    }

    OfferStoreLib.OfferNFT memory offer = _getOfferStore().getOffer(_nft, _tokenId, _offerer);

    if (offer.value > listing.value) {
      revert OfferStoreLib.NotOffered(_nft, _tokenId, _offerer);
    }

    if (offer.price <= 0 || offer.offerer == address(0)) {
      revert OfferStoreLib.NotOffered(_nft, _tokenId, _offerer);
    }

    if (offer.accepted) {
      revert OfferStoreLib.AlreadyAccepted(_nft, _tokenId);
    }

    ERC2981MarketplaceLib.RoyaltyMeta memory percentageRoyalty = ERC2981MarketplaceLib.RoyaltyMeta(
      ERC2981MarketplaceLib.RoyaltyType.PERCENT,
      offer.price,
      offer.value,
      _nonce
    );

    // remain price should be calculated so:
    uint256 remainPrice = offer.price * offer.value;

    // Calculate & Transfer platfrom fee
    (, uint256 marketplaceFee) = _transferMarketplaceRoyalty(percentageRoyalty);

    remainPrice -= marketplaceFee;

    // respect erc2981 royalties
    (, uint256 erc2981fee) = _transferERC2981Royalties(_nft, _tokenId, offer.price, offer.value);

    remainPrice -= erc2981fee;

    // transfer offer price to seller
    _withdraw(listing.seller, remainPrice);

    _getTransmitter().safeTransferFrom(_nft, _tokenId, offer.value, listing.seller, offer.offerer);

    offer.accepted = true;

    _getOfferStore().updateOffer(_nft, _tokenId, offer.offerer, offer);

    //should update listing here
    _syncAfterPurchaseListing(listing, offer.value, offer.offerer);

    emit DistributedMarketplaceLib.OfferAccepted(
      _nft,
      _tokenId,
      offer.price,
      offer.value,
      offer.offerer,
      listing.seller
    );
  }

  function deleteOffer(address _nft, uint256 _tokenId) external override notPaused nonReentrant {
    OfferStoreLib.OfferNFT memory offer = _getOfferStore().getOffer(_nft, _tokenId, msg.sender);

    if (offer.offerer != msg.sender) {
      revert DistributedMarketplaceLib.NotOwner();
    }

    // if (offer.accepted) {
    //   revert OfferStoreLib.AlreadyAccepted(_nft, _tokenId);
    // }

    // return holding amount of money back if offer not accepted
    if (!offer.accepted) {
      _withdraw(offer.offerer, offer.price);
    }

    _getOfferStore().deleteOffer(_nft, _tokenId, payable(msg.sender));

    emit DistributedMarketplaceLib.OfferDeleted(
      _nft,
      _tokenId,
      offer.price,
      offer.value,
      offer.offerer
    );
  }

  function updateOffer(
    address _nft,
    uint256 _tokenId,
    uint256 _price,
    uint256 _value
  ) external payable override notPaused {
    OfferStoreLib.OfferNFT memory offer = _getOfferStore().getOffer(_nft, _tokenId, msg.sender);

    if (offer.offerer != msg.sender) {
      revert DistributedMarketplaceLib.NotOwner();
    }

    if (offer.accepted) {
      revert OfferStoreLib.AlreadyAccepted(_nft, _tokenId);
    }

    // value and price can be only increased, marketplace doesn't make refunds!
    if (_value < offer.value || _price < offer.price) {
      revert DistributedMarketplaceLib.PriceNotMet(_nft, _tokenId, _price);
    }

    // should pay delta between old price and new
    uint256 delta = _value * _price - offer.value * offer.price;

    if (msg.value < delta) {
      revert DistributedMarketplaceLib.PriceNotMet(_nft, _tokenId, _price);
    }

    offer.price = _price;
    offer.value = _value;

    _getOfferStore().updateOffer(_nft, _tokenId, offer.offerer, offer);

    emit DistributedMarketplaceLib.OfferCreated(
      _nft,
      _tokenId,
      offer.value,
      offer.price,
      offer.offerer
    );
  }

  function getOfferCounter(
    address _nft,
    uint256 _tokenId
  ) external view override returns (uint256) {
    return _getOfferStore().getOfferCounter(_nft, _tokenId);
  }

  function getOfferByIndex(
    address _nft,
    uint256 _tokenId,
    uint256 _index
  ) external view override returns (OfferStoreLib.OfferNFT memory) {
    return _getOfferStore().getOfferByIndex(_nft, _tokenId, _index);
  }

  function getOffer(
    address _nft,
    uint256 _tokenId,
    address _offerer
  ) external view override returns (OfferStoreLib.OfferNFT memory) {
    return _getOfferStore().getOffer(_nft, _tokenId, _offerer);
  }
}
