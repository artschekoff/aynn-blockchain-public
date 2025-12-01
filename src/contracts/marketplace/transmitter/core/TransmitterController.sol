// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import '@openzeppelin/contracts/token/ERC1155/IERC1155.sol';
import '@openzeppelin/contracts/utils/introspection/ERC165Checker.sol';

import './ITransmitter.sol';
import './TransmitterConnector.sol';
import './TransmitterLib.sol';
import './ITransmitterController.sol';

contract TransmitterController is TransmitterConnector, ITransmitterController {
  mapping(TransmitterLib.TransmitterType => address) private s_transmitters;

  bytes4 public constant IID_IERC721 = type(IERC721).interfaceId;
  bytes4 public constant IID_IERC1155 = type(IERC1155).interfaceId;

  error UnknownToken();

  function setTransmitterAddress(
    TransmitterLib.TransmitterType _type,
    address _address
  ) external override {
    s_transmitters[_type] = _address;
  }

  function getTransmitterAddress(
    TransmitterLib.TransmitterType _type
  ) public view override returns (address) {
    return s_transmitters[_type];
  }

  function _getTransmitter(
    TransmitterLib.TransmitterType _type
  ) internal view returns (ITransmitter) {
    return ITransmitter(s_transmitters[_type]);
  }

  function _is721(address _nft) internal view returns (bool) {
    return ERC165Checker.supportsInterface(_nft, IID_IERC721);
  }

  function _is1155(address _nft) internal view returns (bool) {
    return ERC165Checker.supportsInterface(_nft, IID_IERC1155);
  }

  function _is721_1155(address _nft) internal view returns (bool) {
    return _is721(_nft) || _is1155(_nft);
  }

  function isSingularItem(address _nft) external view override returns (bool) {
    return _is721(_nft);
  }

  function _isTokenApproved(
    address _nft,
    address _account,
    address _operator,
    uint256 _tokenId
  ) internal view returns (bool) {
    if (_is721_1155(_nft)) {
      return
        _getTransmitter(TransmitterLib.TransmitterType.Transmitter721_1155).isTokenApproved(
          _nft,
          _account,
          _operator,
          _tokenId
        );
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
    if (_is721_1155(_nft)) {
      return
        _isTokenApproved(
          _nft,
          _account,
          getTransmitterAddress(TransmitterLib.TransmitterType.Transmitter721_1155),
          _tokenId
        );
    } else {
      revert UnknownToken();
    }
  }

  // value for ierc721 is 1, for erc1155 is changeble, and return true only if
  // required balance is available
  function isTokenOwner(
    address _nft,
    uint256 _tokenId,
    uint256 _value,
    address _operator
  ) external view override returns (bool) {
    if (_is721_1155(_nft)) {
      return
        _getTransmitter(TransmitterLib.TransmitterType.Transmitter721_1155).isTokenOwner(
          _nft,
          _tokenId,
          _value,
          _operator
        );
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
    if (_is721_1155(_nft)) {
      return
        _getTransmitter(TransmitterLib.TransmitterType.Transmitter721_1155).safeTransferFrom(
          _nft,
          _tokenId,
          _value,
          _account,
          _operator
        );
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
