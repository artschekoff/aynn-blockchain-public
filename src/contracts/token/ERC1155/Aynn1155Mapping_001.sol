// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import '@openzeppelin/contracts/token/ERC1155/ERC1155.sol';
import '@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

/**
@notice Basic 1155 contract, except URI are stored as a mapping, where
each element can be set individually. And folder url in ipfs is undefined
 */

contract Aynn1155Mapping_001 is ERC1155, ERC1155Burnable, Ownable {
  mapping(uint256 => string) public tokenURI;
  uint256 public tokenId;

  constructor() ERC1155('') {}

  function mint(
    uint256 amount,
    string memory _tokenURI,
    bytes memory data
  ) public onlyOwner returns (uint256) {
    uint256 _tokenId = tokenId;
    tokenURI[_tokenId] = _tokenURI;
    _mint(msg.sender, _tokenId, amount, data);
    tokenId++;
    return _tokenId;
  }

  function uri(uint256 _tokenId) public view override returns (string memory) {
    return tokenURI[_tokenId];
  }
}
