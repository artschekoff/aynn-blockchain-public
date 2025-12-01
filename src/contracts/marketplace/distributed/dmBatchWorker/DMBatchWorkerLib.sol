// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

library DMBatchWorkerLib {
  error DelegateCallNotSucceded();

  struct SetRequest {
    address _nft;
    uint256 _tokenId;
    uint256 _price;
    uint256 _value;
  }
  struct AcceptOfferRequest {
    address _nft;
    uint256 _tokenId;
    address _offerer;
  }
}
