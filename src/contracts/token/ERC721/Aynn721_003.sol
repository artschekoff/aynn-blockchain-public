// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol';
import '@openzeppelin/contracts/interfaces/IERC2981.sol';

import '../common/ERC2981Collection.sol';
import './core/ERC721Connector.sol';

// version 0.0.2
contract Aynn721_003 is ERC721Connector {
  using Strings for uint256;

  // Optional mapping for token URIs
  mapping(uint256 => string) private _tokenURIs;

  // Base URI
  string private _baseURIextended;

  /// @dev See {IERC165-supportsInterface}.
  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override(ERC721Enumerable) returns (bool) {
    return interfaceId == type(IERC2981).interfaceId || super.supportsInterface(interfaceId);
  }

  // bps = n * 100 (for 10%: 10 * 100 = 1000)
  constructor(
    string memory _name,
    string memory _symbol,
    address royaltyAddress,
    uint256 royaltyValueBps
  ) payable ERC721(_name, _symbol) {
    if (royaltyValueBps > 0) {
      if (royaltyAddress == address(0)) {
        revert('Invalid royalty address');
      }
      _setRoyalties(royaltyAddress, royaltyValueBps);
    }
  }

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

  function mint(address to, string memory _tokenURI) public notPaused onlyOwner {
    uint256 tokenId = totalSupply() + 1;
    _safeMint(to, tokenId);
    _setTokenURI(tokenId, _tokenURI);
  }

  function mintFolder(
    address to,
    string memory _folderHash,
    uint _batchSize
  ) public notPaused onlyOwner {
    for (uint i = 0; i < _batchSize; i++) {
      uint256 tokenId = totalSupply() + 1;
      _safeMint(to, tokenId);
      _setTokenURI(tokenId, string(abi.encodePacked('ipfs://', _folderHash, '/', tokenId.toString(), '.json')));
    }
  }

  function mintBatch(address to, string[] memory _uris) public notPaused onlyOwner {
    for (uint i = 0; i < _uris.length; i++) {
      uint256 tokenId = totalSupply() + 1;
      _safeMint(to, tokenId);
      _setTokenURI(tokenId, _uris[i]);
    }
  }

  function burn(uint256 _tokenId) external notPaused onlyOwner {
    require(_exists(_tokenId), "ERC721Metadata: token doesn't exist");

    _burn(_tokenId);
  }

  function withdraw() external onlyOwner {
    (bool success, ) = msg.sender.call{value: address(this).balance}('');
    require(success, 'Withdraw Failed');
  }
}

// Silence is gold
