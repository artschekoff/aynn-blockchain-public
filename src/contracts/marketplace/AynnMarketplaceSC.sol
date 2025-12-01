// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import '@openzeppelin/contracts/utils/Counters.sol';
import '@openzeppelin/contracts/utils/structs/EnumerableSet.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import './royalty/ERC2981MarketplaceSC.sol';

// todo: integrate (or not) IAuction
contract AynnMarketplaceSC is ERC2981MarketplaceSC, ReentrancyGuard, Ownable  {
  using Counters for Counters.Counter;
  using EnumerableSet for EnumerableSet.AddressSet;

  // Variables
  // address payable public immutable feeAccount; // the account that receives fees
  // uint256 public immutable feePercent; // the fee percentage on sales

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

  // itemId -> Item

  mapping(address => mapping(uint256 => ListNFT)) private s_listings;

  // nft => tokenId => offerer address => offer struct
  mapping(address => mapping(uint256 => mapping(address => OfferNFT))) private offerNfts;

  // Items counter
  mapping(address => Counters.Counter) private s_itemsListedCounter;
  mapping(address => Counters.Counter) private s_itemsSoldCounter;

  // addresses of all nft contracts linked to marketplace contract
  // EnumerableSet.AddressSet s_nftAddresses;
  address[] s_nftAddresses;
  mapping(address => uint8) s_supportedNftAddresses;

  error PriceNotMet(address _nft, uint256 _tokenId, uint256 _price);
  error ItemNotForSale(address _nft, uint256 _tokenId);
  error NotListed(address _nft, uint256 _tokenId);
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

  event OfferredNFT(
    address indexed nft,
    uint256 indexed tokenId,
    uint256 offerPrice,
    address indexed offerer
  );

  event CanceledOfferredNFT(
    address indexed nft,
    uint256 indexed tokenId,
    uint256 offerPrice,
    address indexed offerer
  );

  event AcceptedNFT(
    address indexed nft,
    uint256 indexed tokenId,
    uint256 offerPrice,
    address offerer,
    address indexed nftOwner
  );

  /* *
   * CONSTRUCTOR
   */
  constructor(uint256 _royaltyFeesInBips) {
    _setRoyalties(msg.sender, _royaltyFeesInBips);
  }

  /// @notice Allows to set the royalties on the contract
  /// @dev This function in a real contract should be protected with a onlyOwner (or equivalent) modifier
  /// @param _recipient the royalties recipient
  /// @param _royaltyFeeInBips royalties value (between 0 and 10000)
  function setRoyalties(address _recipient, uint256 _royaltyFeeInBips) external virtual onlyOwner {
    _setRoyalties(_recipient, _royaltyFeeInBips);
  }

  function getRoyaltyAddress() external view onlyOwner returns (address) {
    return royaltyAddress;
  }

  function getRoyaltyFeesInBips() external view onlyOwner returns (uint256) {
    return royaltyFeesInBips;
  }

  /**
   * UTILITIES
   */

  modifier isListed(address _nft, uint256 _tokenId) {
    ListNFT memory listing = s_listings[_nft][_tokenId];

    if (listing.price <= 0) {
      revert NotListed(_nft, _tokenId);
    }
    _;
  }

  modifier notSold(address _nft, uint256 _tokenId) {
    ListNFT memory listing = s_listings[_nft][_tokenId];

    if (listing.sold) {
      revert Sold(_nft, _tokenId);
    }
    _;
  }

  modifier notListed(
    address _nft,
    uint256 _tokenId,
    address _owner
  ) {
    ListNFT memory listing = s_listings[_nft][_tokenId];

    if (listing.price > 0) {
      revert AlreadyListed(_nft, _tokenId);
    }
    _;
  }

  modifier isOwner(
    address _nft,
    uint256 _tokenId,
    address _spender
  ) {
    IERC721 nft = IERC721(_nft);
    address owner = nft.ownerOf(_tokenId);
    if (_spender != owner) {
      revert NotOwner();
    }
    _;
  }

  modifier isOfferredNFT(
    address _nft,
    uint256 _tokenId,
    address _offerer
  ) {
    OfferNFT memory offer = offerNfts[_nft][_tokenId][_offerer];
    require(offer.offerPrice > 0 && offer.offerer != address(0), 'not offerred nft');
    _;
  }

  /**
   * CORE ACTIONS
   */
  function cancelListing(address _nft, uint256 _tokenId)
    external
    isOwner(_nft, _tokenId, msg.sender)
    isListed(_nft, _tokenId)
  {
    delete (s_listings[_nft][_tokenId]);
    emit ItemCancelled(_nft, _tokenId, msg.sender);
  }

  function listItem(
    address _nft,
    uint256 _tokenId,
    uint256 _price
  )
    external
    payable
    notListed(_nft, _tokenId, msg.sender)
    isOwner(_nft, _tokenId, msg.sender)
    nonReentrant
  {
    if (_price <= 0) {
      revert PriceMustBeAboveZero();
    }

    if (IERC721(_nft).getApproved(_tokenId) != address(this)) {
      revert NotApprovedForMarketplace();
    }

    // if (!IERC721(_nft).isApprovedForAll(msg.sender, address(this))) {
    //   revert NotApprovedForMarketplace();
    // }

    s_listings[_nft][_tokenId] = ListNFT(
      _nft,
      _tokenId,
      payable(msg.sender),
      payable(address(this)),
      _price,
      false
    );

    s_itemsListedCounter[_nft].increment();

    if (s_supportedNftAddresses[_nft] == 0) {
      s_nftAddresses.push(_nft);
      s_supportedNftAddresses[_nft] = 1;
    }

    emit ItemListed(_nft, _tokenId, msg.sender, address(this), _price);
  }

  function getPriceWithRoyalties(address _nft, uint256 _tokenId)
    external
    view
    isListed(_nft, _tokenId)
    returns (uint256)
  {
    ListNFT memory listedItem = s_listings[_nft][_tokenId];
    return _getPriceWithRoyalties(_nft, listedItem.tokenId, listedItem.price);
  }


  function purchaseItem(
    address _nft,
    uint256 _tokenId
  ) external payable isListed(_nft, _tokenId) notSold(_nft, _tokenId) nonReentrant {
    ListNFT memory listedItem = s_listings[_nft][_tokenId];

    uint256 _totalPrice = _getPriceWithRoyalties(_nft, listedItem.tokenId, listedItem.price);

    if (msg.value < _totalPrice) {
      revert PriceNotMet(_nft, _tokenId, listedItem.price);
    }

    if (listedItem.seller == msg.sender) {
      revert SellerCannotBuy(_nft, _tokenId);
    }

    // transferring marketplace royalties
    _transferMarketplaceRoyalty(_nft, listedItem.tokenId, listedItem.price);

    // transferring contract royalties (ERC2981 standart)
    _transferERC2981Royalties(listedItem.nft, _tokenId, listedItem.price);

    // sending money to seller
    (bool sent, ) = payable(listedItem.seller).call{value: listedItem.price}("");
    require(sent, "Should pay to seller");
    // IERC20(_payToken).transferFrom(msg.sender, listedItem.seller, listedItem.price);

    // transferring contract to buyer
    IERC721(_nft).safeTransferFrom(listedItem.seller, msg.sender, _tokenId);

    s_itemsSoldCounter[_nft].increment();

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

  // function withdrawProceeds() external {
  //   uint256 proceeds = s_proceeds[msg.sender];

  //   if (proceeds <= 0) {
  //     revert NoProceeds();
  //   }

  //   s_proceeds[msg.sender] = 0;

  //   payable(msg.sender).transfer(proceeds);

  //   // (bool success, ) = payable(msg.sender).call{value: proceeds}('');

  //   // require(success, 'Transfer failed');
  // }

  function getListedItemsCounter(address _nft) external view returns (uint256) {
    return s_itemsListedCounter[_nft].current();
  }

  function getSoldItemsCounter(address _nft) external view returns (uint256) {
    return s_itemsSoldCounter[_nft].current();
  }

  function getListing(address _nft, uint256 _tokenId) external view returns (ListNFT memory) {
    return s_listings[_nft][_tokenId];
  }

  // function getListings(address _nft) external view returns (ListNFT[] memory) {
  //   uint256 nftCount = s_itemsListedCounter[_nft].current();

  //   ListNFT[] memory nfts = new ListNFT[](nftCount);

  //   for (uint256 i = 0; i < nftCount; i++) {
  //     nfts[0] = s_listings[_nft][i + 1];
  //   }

  //   return nfts;
  // }

  function getNftAddresses() external view returns (address[] memory) {
    return s_nftAddresses;
  }

  // function getNftAddresses() external view returns (address[] memory) {
  //   uint256 addressCount = s_nftAddresses.length();

  //   address[] memory addresses = new address[](addressCount);

  //   for (uint256 i = 0; i < addressCount; i++) {
  //     addresses[i] = s_nftAddresses.at(i);
  //   }

  //   return addresses;
  // }

  // @notice Offer listed NFT
  function offerNFT(
    address _nft,
    uint256 _tokenId,
    uint256 _offerPrice
  ) external isListed(_nft, _tokenId) {
    require(_offerPrice > 0, 'price can not 0');

    ListNFT memory nft = s_listings[_nft][_tokenId];
    (bool sent, ) = payable(address(this)).call{value: _offerPrice}("");
    require(sent, "Should transfer price to marketplace");

    // IERC20(nft.payToken).transferFrom(msg.sender, address(this), _offerPrice);

    offerNfts[_nft][_tokenId][msg.sender] = OfferNFT({
      nft: nft.nft,
      tokenId: nft.tokenId,
      offerer: msg.sender,
      offerPrice: _offerPrice,
      accepted: false
    });

    emit OfferredNFT(nft.nft, nft.tokenId, _offerPrice, msg.sender);
  }

  // @notice Offerer cancel offerring
  function cancelOfferNFT(address _nft, uint256 _tokenId)
    external
    isOfferredNFT(_nft, _tokenId, msg.sender)
  {
    OfferNFT memory offer = offerNfts[_nft][_tokenId][msg.sender];
    require(offer.offerer == msg.sender, 'not offerer');
    require(!offer.accepted, 'offer already accepted');
    delete offerNfts[_nft][_tokenId][msg.sender];
    // IERC20(offer.payToken).transferFrom(msg.sender, offer.offerer, offer.offerPrice);
    (bool sent, ) = payable(offer.offerer).call{value: offer.offerPrice}("");
    require(sent, "Should pay to offerer");

    emit CanceledOfferredNFT(
      offer.nft,
      offer.tokenId,
      offer.offerPrice,
      msg.sender
    );
  }

  // @notice listed NFT owner accept offerring
  function acceptOfferNFT(
    address _nft,
    uint256 _tokenId,
    address _offerer
  ) external isOfferredNFT(_nft, _tokenId, _offerer) isListed(_nft, _tokenId) {
    if (s_listings[_nft][_tokenId].seller == msg.sender) {
      revert SellerCannotBuy(_nft, _tokenId);
    }

    OfferNFT storage offer = offerNfts[_nft][_tokenId][_offerer];
    ListNFT storage list = s_listings[offer.nft][offer.tokenId];

    if (list.sold) {
      revert Sold(_nft, _tokenId);
    }

    if (offer.accepted) {
      revert AlreadyAccepted(_nft, _tokenId);
    }

    require(!offer.accepted, 'offer already accepted');

    list.sold = true;
    offer.accepted = true;

    uint256 totalPrice = offer.offerPrice;

    // Calculate & Transfer platfrom fee
    (, uint256 marketplaceFee) = _transferMarketplaceRoyalty(
      _nft,
      _tokenId,
      offer.offerPrice
    );

    totalPrice -= marketplaceFee;

    // respect erc2981 royalties
    (, uint256 erc2981fee) = _transferERC2981Royalties(
      _nft,
      _tokenId,
      offer.offerPrice
    );

    totalPrice -= erc2981fee;

    // Transfer to sellr
    (bool sent, ) = payable(list.seller).call{value: totalPrice}("");
    require(sent, "Should transfer to seller");
    // IERC20(offer.payToken).transferFrom(msg.sender, list.seller, totalPrice);

    // Transfer NFT to offerer
    IERC721(list.nft).safeTransferFrom(address(this), offer.offerer, list.tokenId);

    emit AcceptedNFT(
      offer.nft,
      offer.tokenId,
      offer.offerPrice,
      offer.offerer,
      list.seller
    );
  }
}
