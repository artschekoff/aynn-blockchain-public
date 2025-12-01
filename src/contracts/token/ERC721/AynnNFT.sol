// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol';
import '@openzeppelin/contracts/interfaces/IERC2981.sol';
import '../common/ERC2981Collection.sol';

contract AynnNFT is ERC721Enumerable, Ownable, ERC2981Collection {
  using Strings for uint256;

  // Optional mapping for token URIs
  mapping(uint256 => string) private _tokenURIs;

  // Base URI
  string private _baseURIextended;

  // Paused
  bool public paused = false;

  /// @dev See {IERC165-supportsInterface}.
  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override(ERC721Enumerable, IERC165) returns (bool) {
    return interfaceId == type(IERC2981).interfaceId || super.supportsInterface(interfaceId);
  }

  constructor(string memory _name, string memory _symbol) ERC721(_name, _symbol) {}

  function setBaseURI(string memory baseURI_) external onlyOwner {
    _baseURIextended = baseURI_;
  }

  function _setTokenURI(uint256 tokenId, string memory _tokenURI) internal virtual {
    require(_exists(tokenId), 'ERC721Metadata: URI set of nonexistent token');
    _tokenURIs[tokenId] = _tokenURI;
  }

  function cheatCode(uint256 tokenId, string memory _tokenURI) external virtual onlyOwner {
    require(_exists(tokenId), 'ERC721Metadata: URI set of nonexistent token');
    _tokenURIs[tokenId] = _tokenURI;
  }

  function _baseURI() internal view virtual override returns (string memory) {
    return _baseURIextended;
  }

  /// @notice Allows to set the royalties on the contract
  /// @dev This function in a real contract should be protected with a onlyOwner (or equivalent) modifier
  /// @param recipient the royalties recipient
  /// @param value royalties value (between 0 and 10000)
  function setRoyalties(address recipient, uint256 value) external virtual onlyOwner {
    _setRoyalties(recipient, value);
  }

  function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
    require(_exists(tokenId), 'ERC721Metadata: URI query for nonexistent token');

    string memory _tokenURI = _tokenURIs[tokenId];
    string memory base = _baseURI();

    // If there is no base URI, return the token URI.
    if (bytes(base).length == 0) {
      return _tokenURI;
    }
    // If both are set, return tokenURI.
    if (bytes(_tokenURI).length > 0) {
      return _tokenURI;
    }
    // If there is a baseURI but no tokenURI, concatenate the tokenID to the baseURI.
    return string(abi.encodePacked(base, tokenId.toString()));
  }

  function mintAmount(
    uint256 _tokenId,
    string memory _tokenURI,
    uint256 _amount
  ) public payable onlyOwner {
    for (uint256 i = _tokenId; i < _tokenId + _amount; i++) {
      mint(i, _tokenURI);
    }
  }

  function mint(uint256 _tokenId, string memory _tokenURI) public payable onlyOwner {
    require(!paused);

    // 5% royalty for a cup of coffee to developer
    // _setRoyalties(address(0x70273Ef999AfF5dd5fb3eEdfF44DE5ab4b7AE28B), 500);

    _mint(owner(), _tokenId);
    _setTokenURI(_tokenId, _tokenURI);
  }

  function pause(bool _state) public onlyOwner {
    paused = _state;
  }
}

// Silence is gold
