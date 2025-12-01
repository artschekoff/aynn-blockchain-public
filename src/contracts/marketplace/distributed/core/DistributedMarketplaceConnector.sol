// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import '../../royalty/ERC2981MarketplaceSC003.sol';
import '../../../state/pause/Pause.sol';
import '../../../finance/payments/Payments.sol';

contract DistributedMarketplaceConnector is
  Ownable,
  Pause,
  Payments,
  ReentrancyGuard,
  ERC2981MarketplaceSC003
{}
