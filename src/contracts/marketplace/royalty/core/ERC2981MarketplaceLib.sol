// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import '../../../security/signature/SignatureLib.sol';

library ERC2981MarketplaceLib {
  error RoyaltiesError();

  enum RoyaltyType {
    PERCENT,
    OFFER,
    LISTING
  }

  enum RoyaltyAction {
    PLUS,
    MINUS
  }

  struct RoyaltyMeta {
    RoyaltyType royaltyType;
    uint256 price;
    uint256 value;
    SignatureLib.NonceRequest nonce;
  }
}
