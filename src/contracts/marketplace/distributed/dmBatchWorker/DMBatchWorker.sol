// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import './IDMBatchWorker.sol';
import './DMBatchWorkerLib.sol';
import '../core/IDistributedMarketplace.sol';
import '../core/DistributedMarketplaceLib.sol';

import '../../royalty/core/ERC2981MarketplaceLib.sol';
import '../../../security/signature/SignatureLib.sol';

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import 'hardhat/console.sol';

contract DMBatchWorker is Ownable, ReentrancyGuard, IDMBatchWorker {
  // those variables are used to sync delegate call
  bytes4 public IID_IERC2981;
  address internal royaltyAddress;
  bool private s_paused;
  mapping(ERC2981MarketplaceLib.RoyaltyType => uint256) _royalties;
  address internal _globalAttestant;

  // mind-sense variables
  mapping(DistributedMarketplaceLib.UnitRole => address) public s_units;

  function setUnitAddress(
    DistributedMarketplaceLib.UnitRole _unitRole,
    address _address
  ) external override onlyOwner {
    s_units[_unitRole] = _address;
  }

  function getUnitAddress(
    DistributedMarketplaceLib.UnitRole _unitRole
  ) external view override onlyOwner returns (address) {
    return s_units[_unitRole];
  }

  function _getMarketplace() internal view returns (address) {
    return s_units[DistributedMarketplaceLib.UnitRole.MARKETPLACE];
  }

  // listings
  function createListingBatch(
    DMBatchWorkerLib.SetRequest[] memory _request,
    SignatureLib.NonceRequest memory _nonce
  ) external payable override {
    for (uint256 i = 0; i < _request.length; i++) {
      DMBatchWorkerLib.SetRequest memory cr = _request[i];
      console.log(cr._nft);

      (bool success, ) = _getMarketplace().delegatecall(
        abi.encodeWithSignature(
          'createListing(address,uint256,uint256,uint256,(address,bytes,uint256,uint32))',
          cr._nft,
          cr._tokenId,
          cr._price,
          cr._value,
          _nonce
        )
      );

      if (!success) {
        revert DMBatchWorkerLib.DelegateCallNotSucceded();
      }
    }
  }

  function updateListingBatch(
    DMBatchWorkerLib.SetRequest[] memory _request
  ) external payable override {
    for (uint256 i = 0; i < _request.length; i++) {
      DMBatchWorkerLib.SetRequest memory cr = _request[i];
      (bool success, ) = _getMarketplace().delegatecall(
        abi.encodeWithSignature(
          'updateListing(address,uint256,uint256,uint256)',
          cr._nft,
          cr._tokenId,
          cr._price,
          cr._value
        )
      );

      if (!success) {
        revert DMBatchWorkerLib.DelegateCallNotSucceded();
      }
    }
  }

  function purchaseItemBatch(
    DMBatchWorkerLib.SetRequest[] memory _request,
    SignatureLib.NonceRequest memory _nonce
  ) external payable override nonReentrant {
    for (uint256 i = 0; i < _request.length; i++) {
      DMBatchWorkerLib.SetRequest memory cr = _request[i];

      (bool success, ) = _getMarketplace().delegatecall(
        abi.encodeWithSignature(
          'purchaseItem(address,uint256,uint256,(address,bytes,uint256,uint32))',
          cr._nft,
          cr._tokenId,
          cr._value,
          _nonce
        )
      );

      if (!success) {
        revert DMBatchWorkerLib.DelegateCallNotSucceded();
      }
    }
  }

  function deleteListingBatch(DMBatchWorkerLib.SetRequest[] memory _request) external override {
    for (uint256 i = 0; i < _request.length; i++) {
      DMBatchWorkerLib.SetRequest memory cr = _request[i];

      (bool success, ) = _getMarketplace().delegatecall(
        abi.encodeWithSignature('deleteListing(address,uint256)', cr._nft, cr._tokenId)
      );

      if (!success) {
        revert DMBatchWorkerLib.DelegateCallNotSucceded();
      }
    }
  }

  function getListingPriceWithRoyalties(
    DMBatchWorkerLib.SetRequest[] memory _request,
    SignatureLib.NonceRequest memory _nonce
  ) external view override returns (uint256) {
    uint256 totalValue = 0;

    for (uint256 i = 0; i < _request.length; i++) {
      DMBatchWorkerLib.SetRequest memory cr = _request[i];

      totalValue += IDistributedMarketplace(payable(_getMarketplace())).getListingPriceWithRoyalties(
        cr._nft,
        cr._tokenId,
        cr._value,
        _nonce
      );
    }

    return totalValue;
  }
}
