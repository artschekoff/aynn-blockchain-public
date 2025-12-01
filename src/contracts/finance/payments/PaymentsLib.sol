// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

library PaymentsLib {
  error NotPayed();

  error NotAllowedToPay(address _nft, uint256 _tokenId);

  error InvalidPayToken();
}
