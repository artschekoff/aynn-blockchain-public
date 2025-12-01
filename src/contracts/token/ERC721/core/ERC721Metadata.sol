// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol';
import '../../ERC165/ERC165.sol';

abstract contract ERC721Metadata is IERC721Metadata, ERC165 {
  string private name;
  string private symbol;

  constructor(string memory _name, string memory _symbol) {
    name = _name;
    symbol = _symbol;
    _registerInterface(
      calcFingerPrint('NameGetter(bytes4)') ^ calcFingerPrint('SymbolGetter(bytes4)')
    );
  }

  function NameGetter() external view returns (string memory) {
    return name;
  }

  function SymbolGetter() external view returns (string memory) {
    return symbol;
  }
}
