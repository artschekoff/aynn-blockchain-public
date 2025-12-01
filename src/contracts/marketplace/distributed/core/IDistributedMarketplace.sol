// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import '@openzeppelin/contracts/access/Ownable.sol';

import '../../listing/core/IListings.sol';
import '../../offer/core/IOffers.sol';
import '../../royalty/core/IERC2981Marketplace.sol';

import '../../../finance/payments/IPayments.sol';
import '../../../state/pause/IPause.sol';

import './DistributedMarketplaceLib.sol';

interface IDistributedMarketplace is IListings, IOffers, IPayments, IPause, IERC2981Marketplace {
  function setUnitAddress(DistributedMarketplaceLib.UnitRole _unitRole, address _address) external;

  function getUnitAddress(
    DistributedMarketplaceLib.UnitRole _unitRole
  ) external view returns (address);
}
