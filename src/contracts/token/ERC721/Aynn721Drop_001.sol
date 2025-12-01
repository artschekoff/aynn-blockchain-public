// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import '@openzeppelin/contracts/utils/Strings.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol';

contract Drop721_001 is ERC721Enumerable, Ownable {
  using Strings for uint256;

  struct UserData {
    uint256 minted;
  }

  string baseURI;
  string public baseExtension = '.json';
  uint256 public cost = 40 ether;
  uint256 public maxSupply = 100;
  uint256 public maxPerTx = 5;
  bool public paused = true;
  uint256 private _scopeIndex = 0; // Clamping cache for random TokenID generation in the anti-sniping algo
  uint256 private immutable _scopeCap; // Size of initial randomized number pool & max generated value (zero indexed)
  mapping(uint256 => uint256) _swappedIDs; // TokenID cache for random TokenID generation in the anti-sniping algo
  uint256 private _preMinted = 2; // Numbers of tokens that need to be preminted
  mapping(address => UserData) private userData; // Mapping to save how many tokens each address mints
  uint256 public maxPerWallet = 50; // Max amount of tokenIDs allowed to be minted by single wallet
  bool public whitelistedOnly = true;
  mapping(address => uint256) public whiteListed;
  mapping(uint256 => string) private _tokenURIs;

  constructor(
    string memory _name,
    string memory _symbol,
    string memory _initBaseURI
  ) ERC721(_name, _symbol) {
    setBaseURI(_initBaseURI);
    _scopeCap = maxSupply - _preMinted;
  }

  // internal
  function _baseURI() internal view virtual override returns (string memory) {
    return baseURI;
  }

  function _genClampedNonce() internal virtual returns (uint256) {
    uint256 scope = _scopeCap - _scopeIndex;
    uint256 swap;
    uint256 result;

    uint256 i = randomNumber() % scope;

    //Setup the value to swap in for the selected number
    if (_swappedIDs[scope - 1] == 0) {
      swap = scope - 1;
    } else {
      swap = _swappedIDs[scope - 1];
    }

    //Select a random number, swap it out with an unselected one then shorten the selection range by 1
    if (_swappedIDs[i] == 0) {
      result = i;
      _swappedIDs[i] = swap;
    } else {
      result = _swappedIDs[i];
      _swappedIDs[i] = swap;
    }
    _scopeIndex++;
    return result + _preMinted;
  }

  function randomNumber() internal view returns (uint256) {
    return uint256(keccak256(abi.encodePacked(block.difficulty, block.timestamp)));
  }

  // public
  function mint(uint256 _mintAmount) public payable {
    uint256 supply = totalSupply();
    require(!paused);
    require(_mintAmount > 0);
    require(_mintAmount <= maxPerTx);
    require(supply + _mintAmount <= maxSupply);
    require(
      userData[msg.sender].minted + _mintAmount <= maxPerWallet,
      'You are trying to mint more NFTs than allowed for your wallet'
    );
    if (whitelistedOnly)
      require(
        whiteListed[msg.sender] >= 1,
        'Error: you are not whitelisted or amount is higher than limit'
      );

    if (msg.sender != owner()) {
      require(msg.value >= cost * _mintAmount);
    }

    for (uint256 i = 1; i <= _mintAmount; i++) {
      uint tokenId = _genClampedNonce() + 1;
      _safeMint(msg.sender, tokenId);
      userData[msg.sender].minted += 1;
      if (whitelistedOnly) whiteListed[msg.sender] -= 1;
    }
  }

  function walletOfOwner(address _owner) public view returns (uint256[] memory) {
    uint256 ownerTokenCount = balanceOf(_owner);
    uint256[] memory tokenIds = new uint256[](ownerTokenCount);
    for (uint256 i; i < ownerTokenCount; i++) {
      tokenIds[i] = tokenOfOwnerByIndex(_owner, i);
    }
    return tokenIds;
  }

  function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
    require(_exists(tokenId), 'ERC721Metadata: URI query for nonexistent token');

    string memory _tokenURI = _tokenURIs[tokenId];
    string memory currentBaseURI = _baseURI();

    // If there is no base URI, return the token URI.
    if (bytes(currentBaseURI).length == 0) {
      return _tokenURI;
    }
    // If both are set, concatenate the baseURI and tokenURI (via abi.encodePacked).
    if (bytes(_tokenURI).length > 0) {
      return string(abi.encodePacked(_tokenURI));
    }
    // If there is a baseURI but no tokenURI, concatenate the tokenID to the baseURI.
    return string(abi.encodePacked(currentBaseURI, tokenId.toString(), baseExtension));
  }

  //only owner
  function setCost(uint256 _newCost) public onlyOwner {
    cost = _newCost;
  }

  function setMaxPerTx(uint256 value) public onlyOwner {
    maxPerTx = value;
  }

  function setBaseURI(string memory _newBaseURI) public onlyOwner {
    baseURI = _newBaseURI;
  }

  function setBaseExtension(string memory _newBaseExtension) public onlyOwner {
    baseExtension = _newBaseExtension;
  }

  function postSetTokenURI(uint256 tokenId, string memory _tokenURI) external onlyOwner {
    require(_exists(tokenId), 'ERC721Metadata: URI set of nonexistent token');
    _tokenURIs[tokenId] = _tokenURI;
  }

  function pause(bool _state) public onlyOwner {
    paused = _state;
  }

  function preMint(uint256 _mintAmount) public onlyOwner {
    uint256 supply = totalSupply();
    require(_mintAmount > 0);
    require(_mintAmount <= _preMinted);
    require(supply + _mintAmount <= maxSupply);

    for (uint256 i = 1; i <= _mintAmount; i++) {
      _safeMint(msg.sender, supply + i);
    }
  }

  function setMaxPerWallet(uint256 value) public onlyOwner {
    maxPerWallet = value;
  }

  function whiteList(address[] memory _addressList, uint256 count) external onlyOwner {
    require(_addressList.length > 0, 'Error: list is empty');

    for (uint256 i = 0; i < _addressList.length; i++) {
      require(_addressList[i] != address(0), 'Address cannot be 0.');
      whiteListed[_addressList[i]] = count;
    }
  }

  function removeWhiteList(address[] memory addressList) external onlyOwner {
    require(addressList.length > 0, 'Error: list is empty');
    for (uint256 i = 0; i < addressList.length; i++) whiteListed[addressList[i]] = 0;
  }

  function updateWhitelistStatus() external onlyOwner {
    whitelistedOnly = !whitelistedOnly;
  }

  function withdraw() public payable onlyOwner {
    (bool success, ) = payable(msg.sender).call{value: address(this).balance}('');
    require(success);
  }
}
