// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import '@openzeppelin/contracts/interfaces/IERC2981.sol';
import '@openzeppelin/contracts/utils/Strings.sol';

import './IAynn1155Folder.sol';
import './Aynn1155Connector.sol';

/**
@notice Basic 1155 contract, with some improvements
 */
contract Aynn1155Folder_001 is Aynn1155FolderConnector, IAynn1155Folder {
  using Strings for uint256;

  uint256 public tokenId;
  string internal folderHash;

  /// @dev See {IERC165-supportsInterface}.
  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override(ERC1155) returns (bool) {
    return interfaceId == type(IERC2981).interfaceId || super.supportsInterface(interfaceId);
  }

  constructor(
    string memory _folderHash,
    address _royaltyAddress,
    uint256 _royaltyValueBps
  ) ERC1155(string(abi.encodePacked('ipfs://', _folderHash, '/{id}.json'))) {
    if (_royaltyValueBps > 0) {
      require(_royaltyAddress != address(0), 'Inavlid royalty address');
      _setRoyalties(_royaltyAddress, _royaltyValueBps);
    }

    folderHash = _folderHash;
    tokenId = 0;
  }

  function mint(
    address _to,
    uint256 _tokenId,
    uint256 _amount,
    bytes memory _data
  ) external override onlyOwner returns (uint256) {
    if (_tokenId > tokenId) {
      tokenId = _tokenId;
    }

    _mint(_to, _tokenId, _amount, _data);
    return _tokenId;
  }

  function mintBatch(
    address to,
    uint256[] memory ids,
    uint256[] memory amounts,
    bytes memory data
  ) public override onlyOwner {
    _mintBatch(to, ids, amounts, data);
  }

  function lastTokenId() external view override returns (uint256) {
    return tokenId;
  }

  function contractURI() external view override returns (string memory) {
    return string(abi.encodePacked('ipfs://', folderHash, '/collection.json'));
  }

  function uri(uint256 _tokenId) public view override returns (string memory) {
    require(_tokenId >= 1 && _tokenId <= tokenId, 'Token id not found');
    return
      string(abi.encodePacked('ipfs://', folderHash, '/', Strings.toString(_tokenId), '.json'));
  }
}
