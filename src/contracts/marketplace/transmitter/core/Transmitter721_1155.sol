// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import '@openzeppelin/contracts/token/ERC1155/IERC1155.sol';
import '@openzeppelin/contracts/utils/introspection/ERC165Checker.sol';

import './ITransmitter.sol';
import './TransmitterConnector.sol';

contract Transmitter721_1155 is TransmitterConnector, ITransmitter {
  bytes4 public constant IID_IERC721 = type(IERC721).interfaceId;
  bytes4 public constant IID_IERC1155 = type(IERC1155).interfaceId;

  error UnknownToken();

  function _isTokenApproved(
    address _nft,
    address _account,
    address _operator,
    uint256 _tokenId
  ) internal view returns (bool) {
    if (ERC165Checker.supportsInterface(_nft, IID_IERC721)) {
      return IERC721(_nft).getApproved(_tokenId) == _operator;
    } else if (ERC165Checker.supportsInterface(_nft, IID_IERC1155)) {
      return IERC1155(_nft).isApprovedForAll(_account, _operator);
    } else {
      revert UnknownToken();
    }
  }

  function isTokenApproved(
    address _nft,
    address _account,
    address _operator,
    uint256 _tokenId
  ) external view override returns (bool) {
    return _isTokenApproved(_nft, _account, _operator, _tokenId);
  }

  function isTokenApprovedOwn(
    address _nft,
    address _account,
    uint256 _tokenId
  ) external view override returns (bool) {
    return _isTokenApproved(_nft, _account, address(this), _tokenId);
  }

  // value for ierc721 is 1, for erc1155 is changeble, and return true only if
  // required balance is available
  function isTokenOwner(
    address _nft,
    uint256 _tokenId,
    uint256 _value,
    address _operator
  ) external view override returns (bool) {
    if (ERC165Checker.supportsInterface(_nft, IID_IERC721)) {
      return _operator == IERC721(_nft).ownerOf(_tokenId);
    } else if (ERC165Checker.supportsInterface(_nft, IID_IERC1155)) {
      return IERC1155(_nft).balanceOf(_operator, _tokenId) >= _value;
    } else {
      revert UnknownToken();
    }
  }

  function _safeTransferFrom(
    address _nft,
    uint256 _tokenId,
    uint256 _value,
    address _account,
    address _operator
  ) internal {
    if (ERC165Checker.supportsInterface(_nft, IID_IERC721)) {
      IERC721(_nft).safeTransferFrom(_account, _operator, _tokenId);
    } else if (ERC165Checker.supportsInterface(_nft, IID_IERC1155)) {
      IERC1155(_nft).safeTransferFrom(_account, _operator, _tokenId, _value, '');
    } else {
      revert UnknownToken();
    }
  }

  function safeTransferFrom(
    address _nft,
    uint256 _tokenId,
    uint256 _value,
    address _account,
    address _operator
  ) external override IsRemoteAllowed(msg.sender) {
    _safeTransferFrom(_nft, _tokenId, _value, _account, _operator);
  }
}
