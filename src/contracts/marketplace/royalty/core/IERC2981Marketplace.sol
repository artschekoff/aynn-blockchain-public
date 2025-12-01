// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import './ERC2981MarketplaceLib.sol';
import '../../../security/signature/ISignature.sol';

interface IERC2981Marketplace is ISignature {
  function getRoyaltyAddress() external view returns (address);

  function setRoyalties(
    address _recipient,
    uint256 _royaltyFeePercent,
    uint256 _royaltyFeeListing,
    uint256 _royaltyFeeOffer
  ) external;

  function royaltyInfo(
    ERC2981MarketplaceLib.RoyaltyMeta memory _royaltyMeta
  ) external view returns (address receiver, uint256 royaltyAmount);
}
