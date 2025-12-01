// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/security/Pausable.sol';

contract Aynn721_Simple_001 is ERC721, ERC721URIStorage, ERC721Burnable, Ownable, Pausable {
  uint256 private _lastTokenId;

  constructor(string memory _name, string memory _symbol) ERC721(_name, _symbol) {}

  function mint(address to, string memory uri) public onlyOwner {
    _safeMint(to, _lastTokenId);
    _setTokenURI(_lastTokenId, uri);
    _lastTokenId += 1;
  }

  function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
    require(_isApprovedOrOwner(msg.sender, tokenId));
    super._burn(tokenId);
  }

  function tokenURI(
    uint256 tokenId
  ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
    return super.tokenURI(tokenId);
  }

  function supportsInterface(
    bytes4 interfaceId
  ) public view override(ERC721, ERC721URIStorage) returns (bool) {
    return super.supportsInterface(interfaceId);
  }

  function setPaused(bool value) public onlyOwner {
    if (value) {
      _pause();
    } else {
      _unpause();
    }
  }
}
