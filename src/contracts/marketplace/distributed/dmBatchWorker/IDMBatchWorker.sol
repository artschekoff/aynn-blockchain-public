// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import './DMBatchWorkerLib.sol';
import '../../../security/signature/SignatureLib.sol';
import '../core/DistributedMarketplaceLib.sol';

interface IDMBatchWorker {
  function setUnitAddress(DistributedMarketplaceLib.UnitRole _unitRole, address _address) external;

  function getUnitAddress(
    DistributedMarketplaceLib.UnitRole _unitRole
  ) external view returns (address);

  // listings
  function createListingBatch(
    DMBatchWorkerLib.SetRequest[] memory _request,
    SignatureLib.NonceRequest memory _nonce
  ) external payable;

  function updateListingBatch(DMBatchWorkerLib.SetRequest[] memory _request) external payable;

  function purchaseItemBatch(
    DMBatchWorkerLib.SetRequest[] memory _request,
    SignatureLib.NonceRequest memory _nonce
  ) external payable;

  function deleteListingBatch(DMBatchWorkerLib.SetRequest[] memory _request) external;

  function getListingPriceWithRoyalties(
    DMBatchWorkerLib.SetRequest[] memory _request,
    SignatureLib.NonceRequest memory _nonce
  ) external view returns (uint256);
}
