// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import './core/DistributedMarketplace.sol';

contract AynnDistributedMarketplace_001 is DistributedMarketplace {
  constructor(
    address _royaltyRecipient,
    uint256 _royaltyFeePercent,
    uint256 _royaltyFeeListing,
    uint256 _royaltyFeeOffer
  )
    DistributedMarketplace(
      _royaltyRecipient,
      _royaltyFeePercent,
      _royaltyFeeListing,
      _royaltyFeeOffer
    )
  {}
}
