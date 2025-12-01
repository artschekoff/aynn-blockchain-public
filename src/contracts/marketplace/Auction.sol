// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '../finance/multiCurrency/MultiCurrency.sol';
import './royalty/ERC2981Marketplace.sol';
import './IAuction.sol';

contract Auction is IAuction, MultiCurrency, ERC2981Marketplace {
  struct AuctionNFT {
    address nft;
    uint256 tokenId;
    address creator;
    address payToken;
    uint256 initialPrice;
    uint256 minBid;
    uint256 startTime;
    uint256 endTime;
    address lastBidder;
    uint256 heighestBid;
    address winner;
    bool success;
  }

  // nft => tokenId => acuton struct
  mapping(address => mapping(uint256 => AuctionNFT)) private s_auctionNfts;

  event CreatedAuction(
    address indexed nft,
    uint256 indexed tokenId,
    address payToken,
    uint256 price,
    uint256 minBid,
    uint256 startTime,
    uint256 endTime,
    address indexed creator
  );

  event PlacedBid(
    address indexed nft,
    uint256 indexed tokenId,
    address payToken,
    uint256 bidPrice,
    address indexed bidder
  );

  event ResultedAuction(
    address indexed nft,
    uint256 indexed tokenId,
    address creator,
    address indexed winner,
    uint256 price,
    address caller
  );

  modifier isAuction(address _nft, uint256 _tokenId) {
    AuctionNFT memory auction = s_auctionNfts[_nft][_tokenId];
    require(auction.nft != address(0) && !auction.success, 'auction already created');
    _;
  }

  modifier isNotAuction(address _nft, uint256 _tokenId) {
    AuctionNFT memory auction = s_auctionNfts[_nft][_tokenId];
    require(auction.nft == address(0) || auction.success, 'auction does not exist');
    _;
  }

  function createAuction(
    address _nft,
    uint256 _tokenId,
    address _payToken,
    uint256 _price,
    uint256 _minBid,
    uint256 _startTime,
    uint256 _endTime
  ) override external isNotAuction(_nft, _tokenId) {
    // require(_multiCurrency != address(0), 'mc contract is missed');
    // require(IMultiCurrency(_multiCurrency).isPayableToken(_payToken), 'not payable token');

    IERC721 nft = IERC721(_nft);
    require(nft.ownerOf(_tokenId) == msg.sender, 'not nft owner');
    require(_endTime > _startTime, 'invalid end time');

    nft.transferFrom(msg.sender, address(this), _tokenId);

    s_auctionNfts[_nft][_tokenId] = AuctionNFT({
      nft: _nft,
      tokenId: _tokenId,
      creator: msg.sender,
      payToken: _payToken,
      initialPrice: _price,
      minBid: _minBid,
      startTime: _startTime,
      endTime: _endTime,
      lastBidder: address(0),
      heighestBid: _price,
      winner: address(0),
      success: false
    });

    emit CreatedAuction(
      _nft,
      _tokenId,
      _payToken,
      _price,
      _minBid,
      _startTime,
      _endTime,
      msg.sender
    );
  }

  // @notice Cancel auction
  function cancelAuction(address _nft, uint256 _tokenId) override external isAuction(_nft, _tokenId) {
    AuctionNFT memory auction = s_auctionNfts[_nft][_tokenId];
    require(auction.creator == msg.sender, 'not auction creator');
    require(block.timestamp < auction.startTime, 'auction already started');
    require(auction.lastBidder == address(0), 'already have bidder');

    IERC721 nft = IERC721(_nft);
    nft.transferFrom(address(this), msg.sender, _tokenId);
    delete s_auctionNfts[_nft][_tokenId];
  }

  // @notice Bid place auction
  function bidPlace(
    address _nft,
    uint256 _tokenId,
    uint256 _bidPrice
  ) override external isAuction(_nft, _tokenId) {
    require(block.timestamp >= s_auctionNfts[_nft][_tokenId].startTime, 'auction not start');
    require(block.timestamp <= s_auctionNfts[_nft][_tokenId].endTime, 'auction ended');
    require(
      _bidPrice >= s_auctionNfts[_nft][_tokenId].heighestBid + s_auctionNfts[_nft][_tokenId].minBid,
      'less than min bid price'
    );

    AuctionNFT storage auction = s_auctionNfts[_nft][_tokenId];
    IERC20 payToken = IERC20(auction.payToken);
    payToken.transferFrom(msg.sender, address(this), _bidPrice);

    if (auction.lastBidder != address(0)) {
      address lastBidder = auction.lastBidder;
      uint256 lastBidPrice = auction.heighestBid;

      // Transfer back to last bidder
      payToken.transfer(lastBidder, lastBidPrice);
    }

    // Set new heighest bid price
    auction.lastBidder = msg.sender;
    auction.heighestBid = _bidPrice;

    emit PlacedBid(_nft, _tokenId, auction.payToken, _bidPrice, msg.sender);
  }

  // @notice Result auction, can call by auction creator, heighest bidder, or marketplace owner only!
  function resultAuction(address _nft, uint256 _tokenId) override external {
    require(!s_auctionNfts[_nft][_tokenId].success, 'already resulted');
    require(
      msg.sender == owner() ||
        msg.sender == s_auctionNfts[_nft][_tokenId].creator ||
        msg.sender == s_auctionNfts[_nft][_tokenId].lastBidder,
      'not creator, winner, or owner'
    );
    require(block.timestamp > s_auctionNfts[_nft][_tokenId].endTime, 'auction not ended');

    AuctionNFT storage auction = s_auctionNfts[_nft][_tokenId];

    IERC20 payToken = IERC20(auction.payToken);
    IERC721 nft = IERC721(auction.nft);

    auction.success = true;
    auction.winner = auction.creator;

    uint256 heighestBid = auction.heighestBid;
    uint256 totalPrice = heighestBid;

    // Calculate & Transfer platfrom fee
    (address platformFeeAddress, uint256 platformFeeValue) = royaltyInfo(_tokenId, heighestBid);
    payToken.transfer(platformFeeAddress, platformFeeValue);

    totalPrice -= platformFeeValue;

    // respect erc2981 royalties
    (address erc2981address, uint256 erc2981value) = _getERC2981Royalties(
      _nft,
      _tokenId,
      heighestBid
    );

    if (erc2981value > 0) {
      //   uint256 royaltyTotal = calculateRoyalty(royaltyFee, heighestBid);

      // Transfer royalty fee to collection owner

      (bool s2981, ) = payable(erc2981address).call{value: erc2981value}('');
      require(s2981, 'should pay ERC2981 fee for contract');

      payToken.transfer(erc2981address, erc2981value);
      totalPrice -= erc2981value;
    }

    // Transfer to auction creator
    payToken.transfer(auction.creator, totalPrice);

    // Transfer NFT to the winner
    nft.transferFrom(address(this), auction.lastBidder, auction.tokenId);

    emit ResultedAuction(
      _nft,
      _tokenId,
      auction.creator,
      auction.lastBidder,
      auction.heighestBid,
      msg.sender
    );
  }
}
