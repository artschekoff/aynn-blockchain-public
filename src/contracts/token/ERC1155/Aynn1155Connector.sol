// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import '@openzeppelin/contracts/token/ERC1155/ERC1155.sol';
import '@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '../../state/pause/Pause.sol';

import '../common/ERC2981Collection.sol';

abstract contract Aynn1155FolderConnector is ERC1155, ERC1155Burnable, Ownable, ERC2981Collection, Pause {}
