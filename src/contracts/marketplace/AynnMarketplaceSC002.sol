// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import '@openzeppelin/contracts/utils/Counters.sol';
import '@openzeppelin/contracts/utils/structs/EnumerableSet.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import './royalty/ERC2981MarketplaceSC002.sol';

// import 'hardhat/console.sol';

// todo: integrate (or not) IAuction
contract AynnMarketplaceSC002 is ERC2981MarketplaceSC002, ReentrancyGuard, Ownable {
  using Counters for Counters.Counter;
  using EnumerableSet for EnumerableSet.AddressSet;

  ////////////////////////////////////
  /// @notice area STRUCTURES
  ////////////////////////////////////
  struct ListNFT {
    address nft;
    uint256 tokenId;
    address payable seller;
    address payable owner;
    uint256 price;
    bool sold;
  }

  struct OfferNFT {
    address nft;
    uint256 tokenId;
    address offerer;
    uint256 offerPrice;
    bool accepted;
  }

  enum ListingCounterType {
    LISTED,
    SOLD,
    OFFERED,
    ACCEPTED
  }

  ////////////////////////////////////
  /// @notice area VARIABLES
  ////////////////////////////////////

  // itemId -> Item
  mapping(address => mapping(uint256 => ListNFT)) private s_listings;

  // address => 0 -> tokenId = 12
  // address => 1 -> tokenId = 1
  // ...etc

  // nft => [index] => tokenId
  mapping(address => mapping(uint256 => uint256)) private s_listings_tokenids;

  // Items counter
  mapping(address => mapping(ListingCounterType => Counters.Counter)) s_listings_counters;

  // nft => tokenId => offerer address => offer struct
  mapping(address => mapping(uint256 => mapping(address => OfferNFT))) private s_offers;

  mapping(address => mapping(uint256 => mapping(uint256 => address))) private s_offers_addresses;

  mapping(address => mapping(uint256 => Counters.Counter)) s_offers_counters;

  // addresses of all nft contracts linked to marketplace contract
  // EnumerableSet.AddressSet s_nftAddresses;
  address[] s_nft_addresses;
  mapping(address => uint8) s_supported_nft_addresses;

  ////////////////////////////////////
  /// @notice area ERRORS
  ////////////////////////////////////
  error PriceNotMet(address _nft, uint256 _tokenId, uint256 _price);
  error ItemNotForSale(address _nft, uint256 _tokenId);
  error NotListed(address _nft, uint256 _tokenId);
  error NotOffered(address _nft, uint256 _tokenId, address _offerer);
  error Sold(address _nft, uint256 _tokenId);
  error AlreadyListed(address _nft, uint256 _tokenId);
  error AlreadyAccepted(address _nft, uint256 _tokenId);
  error NotAllowedToPay(address _nft, uint256 _tokenId);
  error SellerCannotBuy(address _nft, uint256 _tokenId);
  error NoProceeds();
  error NotOwner();
  error NotApprovedForMarketplace();
  error PriceMustBeAboveZero();
  error InvalidPayToken();

  ////////////////////////////////////
  /// @notice area EVENTS
  ////////////////////////////////////

  event ItemListed(
    address indexed nft,
    uint256 tokenId,
    address indexed seller,
    address indexed owner,
    uint256 price
  );

  event ItemPurchased(
    address indexed nft,
    uint256 tokenId,
    address indexed seller,
    address indexed owner,
    uint256 price
  );

  event ItemCancelled(address indexed _nft, uint256 indexed _tokenId, address indexed _seller);

  event OfferMade(
    address indexed nft,
    uint256 indexed tokenId,
    uint256 offerPrice,
    address indexed offerer
  );

  event OfferCancelled(
    address indexed nft,
    uint256 indexed tokenId,
    uint256 offerPrice,
    address indexed offerer
  );

  event OfferAccepted(
    address indexed nft,
    uint256 indexed tokenId,
    uint256 offerPrice,
    address offerer,
    address indexed nftOwner
  );

  ////////////////////////////////////
  /// @notice area MODIFIERS
  ////////////////////////////////////
  modifier isListed(address _nft, uint256 _tokenId) {
    if (s_listings[_nft][_tokenId].price <= 0) {
      revert NotListed(_nft, _tokenId);
    }
    _;
  }

  modifier notSold(address _nft, uint256 _tokenId) {
    if (s_listings[_nft][_tokenId].sold) {
      revert Sold(_nft, _tokenId);
    }
    _;
  }

  modifier notListed(address _nft, uint256 _tokenId) {
    if (s_listings[_nft][_tokenId].price > 0) {
      revert AlreadyListed(_nft, _tokenId);
    }
    _;
  }

  modifier isOwner(
    address _nft,
    uint256 _tokenId,
    address _spender
  ) {
    if (_spender != IERC721(_nft).ownerOf(_tokenId)) {
      revert NotOwner();
    }
    _;
  }

  modifier isOffered(
    address _nft,
    uint256 _tokenId,
    address _offerer
  ) {
    OfferNFT memory offer = s_offers[_nft][_tokenId][_offerer];
    if (offer.offerPrice <= 0 || offer.offerer == address(0)) {
      revert NotOffered(_nft, _tokenId, _offerer);
    }
    _;
  }

  ////////////////////////////////////
  /// @notice area CONSTRUCTOR
  ////////////////////////////////////
  ///
  /// PercentInBips - purchaseItem, acceptOffer
  /// Fixed - listItem, makeOffer
  /// Address = deployer
  ///
  ////////////////////////////////////
  constructor(uint256 _royaltyFeePercent, uint256 _royaltyFeeListing, uint256 _royaltyFeeOffer) {
    _setRoyalties(msg.sender, RoyaltyType.PERCENT, _royaltyFeePercent);
    _setRoyalties(msg.sender, RoyaltyType.LISTING, _royaltyFeeListing);
    _setRoyalties(msg.sender, RoyaltyType.OFFER, _royaltyFeeOffer);
    _setNonce(2);
  }

  ////////////////////////////////////
  /// @notice area CORE
  ////////////////////////////////////
  function cancelListing(
    address _nft,
    uint256 _tokenId
  ) external isOwner(_nft, _tokenId, msg.sender) isListed(_nft, _tokenId) {
    delete (s_listings[_nft][_tokenId]);
    s_listings_counters[_nft][ListingCounterType.LISTED].decrement();
    emit ItemCancelled(_nft, _tokenId, msg.sender);
  }

  function listItem(
    address _nft,
    uint256 _tokenId,
    uint256 _price,
    uint256 _nonce
  ) external payable isOwner(_nft, _tokenId, msg.sender) {
    if (_price <= 0) {
      revert PriceMustBeAboveZero();
    }

    if (s_listings[_nft][_tokenId].price > 0) {
      revert AlreadyListed(_nft, _tokenId);
    }

    RoyaltyMeta memory royaltyMeta = RoyaltyMeta(RoyaltyType.LISTING, _price, _nonce);

    (, uint256 listingFee) = royaltyInfo(royaltyMeta);

    if (msg.value < listingFee) {
      revert PriceNotMet(_nft, _tokenId, _price);
    }

    if (IERC721(_nft).getApproved(_tokenId) != address(this)) {
      revert NotApprovedForMarketplace();
    }

    // sending money to seller
    _transferMarketplaceRoyalty(royaltyMeta);

    s_listings[_nft][_tokenId] = ListNFT(
      _nft,
      _tokenId,
      payable(msg.sender),
      payable(address(this)),
      _price,
      false
    );

    s_listings_tokenids[_nft][
      s_listings_counters[_nft][ListingCounterType.LISTED].current()
    ] = _tokenId;

    s_listings_counters[_nft][ListingCounterType.LISTED].increment();

    if (s_supported_nft_addresses[_nft] == 0) {
      s_nft_addresses.push(_nft);
      s_supported_nft_addresses[_nft] = 1;
    }

    emit ItemListed(_nft, _tokenId, msg.sender, address(this), _price);
  }

  function purchaseItem(
    address _nft,
    uint256 _tokenId,
    uint256 _nonce
  ) external payable isListed(_nft, _tokenId) notSold(_nft, _tokenId) nonReentrant {
    ListNFT memory listedItem = s_listings[_nft][_tokenId];

    RoyaltyMeta memory royaltyMeta = RoyaltyMeta(RoyaltyType.PERCENT, listedItem.price, _nonce);

    uint256 totalPrice = _getPriceWithRoyalties(_nft, listedItem.tokenId, royaltyMeta);

    if (msg.value < totalPrice) {
      revert PriceNotMet(_nft, _tokenId, listedItem.price);
    }

    if (listedItem.seller == msg.sender) {
      revert SellerCannotBuy(_nft, _tokenId);
    }

    // transferring marketplace royalties
    _transferMarketplaceRoyalty(royaltyMeta);

    // transferring contract royalties (ERC2981 standart)
    _transferERC2981Royalties(listedItem.nft, _tokenId, listedItem.price);

    // sending money to seller
    (bool sent, ) = payable(listedItem.seller).call{value: listedItem.price}('');
    require(sent, 'Should pay to seller');

    // transferring contract to buyer
    IERC721(_nft).safeTransferFrom(listedItem.seller, msg.sender, _tokenId);

    s_listings_counters[_nft][ListingCounterType.SOLD].increment();

    s_listings[_nft][_tokenId].sold = true;
    s_listings[_nft][_tokenId].owner = payable(msg.sender);

    emit ItemPurchased(_nft, _tokenId, listedItem.seller, msg.sender, listedItem.price);
  }

  function updateListing(
    address _nft,
    uint256 _tokenId,
    uint256 _newPrice
  ) external isListed(_nft, _tokenId) nonReentrant isOwner(_nft, _tokenId, msg.sender) {
    if (_newPrice == 0) {
      revert PriceMustBeAboveZero();
    }

    s_listings[_nft][_tokenId].price = _newPrice;

    emit ItemListed(_nft, _tokenId, msg.sender, address(this), _newPrice);
  }

  /// @notice Offer functionality:
  /// @dev
  /// 1. There is a listed NFT on a platform (_nft and _tokenId)
  /// 2. It is selling by fixed price defined by seller right now
  ///
  /// Random guy can (offerer) view this item, and if he doesnt like the price - offer his own
  /// 1. He pays platform fees
  /// 2. Transfers amount of offered money to marketplace (_offerPrice)
  /// 3. Registeres his offer in a system
  ///
  /// Owner on NFT sees list of offers, and if he see appropriate for him, he can accept offer
  /// 1. Previously reserved money from offerer comes to him in amount of _offerPrice
  /// 2. NFT transfers to offerer
  /// 3. Merketplace platform fees are paid
  /// 4. Mark offer as accepted, and ListedItem as sold
  ///
  /// @param _nft nft related to offer
  /// @param _tokenId tokenId related to offer
  /// @param _offerPrice ammount of money for offer
  function makeOffer(
    address _nft,
    uint256 _tokenId,
    uint256 _offerPrice,
    uint256 _nonce
  ) external payable {
    // check input params
    require(_offerPrice > 0, 'Price can not be 0');

    // check nft item state
    ListNFT memory nft = s_listings[_nft][_tokenId];

    if (nft.price <= 0) {
      revert NotListed(_nft, _tokenId);
    }

    if (nft.sold) {
      revert Sold(_nft, _tokenId);
    }

    // check all fees here
    RoyaltyMeta memory royaltyMeta = RoyaltyMeta(RoyaltyType.OFFER, _offerPrice, _nonce);

    (, uint256 offerFeeRoyalty) = royaltyInfo(royaltyMeta);

    royaltyMeta = RoyaltyMeta(RoyaltyType.PERCENT, _offerPrice, _nonce);

    uint256 totalSellingPrice = _getPriceWithRoyalties(_nft, _tokenId, royaltyMeta);

    if (msg.value < totalSellingPrice + offerFeeRoyalty) {
      revert PriceNotMet(_nft, _tokenId, _offerPrice);
    }

    _transferMarketplaceRoyalty(royaltyMeta);

    // we hold amount of offer on marketplace
    // in case on cancel - return it back
    s_offers[_nft][_tokenId][msg.sender] = OfferNFT({
      nft: nft.nft,
      tokenId: nft.tokenId,
      offerer: msg.sender,
      offerPrice: _offerPrice,
      accepted: false
    });

    s_offers_addresses[_nft][_tokenId][s_offers_counters[_nft][_tokenId].current()] = msg.sender;

    s_offers_counters[_nft][_tokenId].increment();

    emit OfferMade(nft.nft, nft.tokenId, _offerPrice, msg.sender);
  }

  // @notice Offerer cancel offerring
  function cancelOffer(
    address _nft,
    uint256 _tokenId
  ) external isOffered(_nft, _tokenId, msg.sender) {
    OfferNFT memory offer = s_offers[_nft][_tokenId][msg.sender];
    require(offer.offerer == msg.sender, 'Not offerer');
    require(!offer.accepted, 'Offer already accepted');

    (bool sent, ) = payable(offer.offerer).call{value: offer.offerPrice}('');
    require(sent, 'Should pay to offerer');

    // return reserved amount to offerer back
    delete s_offers[_nft][_tokenId][msg.sender];

    emit OfferCancelled(offer.nft, offer.tokenId, offer.offerPrice, msg.sender);
  }

  // @notice listed NFT owner accept offerring
  function acceptOffer(
    address _nft,
    uint256 _tokenId,
    address _offerer,
    uint256 _nonce
  ) external isListed(_nft, _tokenId) {
    if (s_listings[_nft][_tokenId].seller != msg.sender) {
      revert NotOwner();
    }

    if (s_listings[_nft][_tokenId].seller == _offerer) {
      revert SellerCannotBuy(_nft, _tokenId);
    }

    OfferNFT storage offer = s_offers[_nft][_tokenId][_offerer];
    ListNFT storage list = s_listings[offer.nft][offer.tokenId];

    if (offer.offerPrice <= 0 || offer.offerer == address(0)) {
      revert NotOffered(_nft, _tokenId, _offerer);
    }

    if (list.sold) {
      revert Sold(_nft, _tokenId);
    }

    if (offer.accepted) {
      revert AlreadyAccepted(_nft, _tokenId);
    }

    list.sold = true;
    offer.accepted = true;

    RoyaltyMeta memory royaltyMeta = RoyaltyMeta(RoyaltyType.PERCENT, offer.offerPrice, _nonce);

    // here we should teke percent from offer.offerPrice
    // do not ask user who accepts offer (seller) pay any extras
    uint256 totalPrice = _getPriceWithRoyalties(_nft, _tokenId, royaltyMeta);

    // Calculate & Transfer platfrom fee
    (, uint256 marketplaceFee) = _transferMarketplaceRoyalty(royaltyMeta);

    totalPrice -= marketplaceFee;

    // respect erc2981 royalties
    (, uint256 erc2981fee) = _transferERC2981Royalties(_nft, _tokenId, offer.offerPrice);

    totalPrice -= erc2981fee;

    // Transfer offer price to seller
    (bool sent, ) = payable(list.seller).call{value: offer.offerPrice}('');
    require(sent, 'Should pay to seller');

    // Transfer NFT to offerer
    IERC721(list.nft).safeTransferFrom(list.seller, offer.offerer, list.tokenId);

    emit OfferAccepted(offer.nft, offer.tokenId, offer.offerPrice, offer.offerer, list.seller);
  }

  ////////////////////////////////////
  /// @notice area UTILITIES
  ////////////////////////////////////
  function getListingCounter(
    address _nft,
    ListingCounterType _listingCounterType
  ) external view returns (uint256) {
    return s_listings_counters[_nft][_listingCounterType].current();
  }

  function getOfferCounter(address _nft, uint256 _tokenId) external view returns (uint256) {
    return s_offers_counters[_nft][_tokenId].current();
  }

  function getOffer(
    address _nft,
    uint256 _tokenId,
    address _offerer
  ) external view returns (OfferNFT memory) {
    return s_offers[_nft][_tokenId][_offerer];
  }

  function getOfferByIndex(
    address _nft,
    uint256 _tokenId,
    uint256 _index
  ) external view returns (OfferNFT memory) {
    return s_offers[_nft][_tokenId][s_offers_addresses[_nft][_tokenId][_index]];
  }

  function getListing(address _nft, uint256 _tokenId) external view returns (ListNFT memory) {
    return s_listings[_nft][_tokenId];
  }

  function getListingByIndex(address _nft, uint256 _index) external view returns (ListNFT memory) {
    return s_listings[_nft][s_listings_tokenids[_nft][_index]];
  }

  function getNftAddresses() external view returns (address[] memory) {
    return s_nft_addresses;
  }

  function withdraw(address _to) external onlyOwner {
    (bool success, ) = payable(_to).call{value: address(this).balance}('');
    require(success, 'Withdraw Failed');
  }

  ////////////////////////////////////
  /// @notice area ROYALTIES
  ////////////////////////////////////
  /// @notice Allows to set the royalties on the contract
  /// @dev This function in a real contract should be protected with a onlyOwner (or equivalent) modifier
  /// @param _recipient the royalties recipient
  /// @param _royaltyFeePercent royalties value (between 0 and 10000)
  /// @param _royaltyFeeListing fee for fixed-price operations
  /// @param _royaltyFeeOffer fee for fixed-price operations
  function setRoyalties(
    address _recipient,
    uint256 _royaltyFeePercent,
    uint256 _royaltyFeeListing,
    uint256 _royaltyFeeOffer
  ) external virtual onlyOwner {
    _setRoyalties(_recipient, RoyaltyType.PERCENT, _royaltyFeePercent);
    _setRoyalties(_recipient, RoyaltyType.LISTING, _royaltyFeeListing);
    _setRoyalties(_recipient, RoyaltyType.OFFER, _royaltyFeeOffer);
  }

  function setNonce(uint256 _nonce) external onlyOwner {
    _setNonce(_nonce);
  }

  function getRoyaltyAddress() external view onlyOwner returns (address) {
    return royaltyAddress;
  }

  function getRoyaltyFees(
    uint256 _price,
    RoyaltyType _royaltyType,
    uint256 _nonce
  ) external view returns (uint256) {
    RoyaltyMeta memory royaltyMeta = RoyaltyMeta(_royaltyType, _price, _nonce);

    (, uint256 royaltyValue) = royaltyInfo(royaltyMeta);

    return royaltyValue;
  }

  function getListingPriceWithRoyalties(
    address _nft,
    uint256 _tokenId,
    uint256 _nonce
  ) external view isListed(_nft, _tokenId) returns (uint256) {
    ListNFT memory listedItem = s_listings[_nft][_tokenId];

    RoyaltyMeta memory royaltyMeta = RoyaltyMeta(RoyaltyType.PERCENT, listedItem.price, _nonce);

    return _getPriceWithRoyalties(_nft, listedItem.tokenId, royaltyMeta);
  }

  function getOfferPriceWithRoyalties(
    address _nft,
    uint256 _tokenId,
    uint256 _price,
    RoyaltyType _royaltyType,
    uint256 _nonce
  ) external view isListed(_nft, _tokenId) returns (uint256) {
    RoyaltyMeta memory royaltyMeta = RoyaltyMeta(_royaltyType, _price, _nonce);

    return _getPriceWithRoyalties(_nft, _tokenId, royaltyMeta);
  }
}
