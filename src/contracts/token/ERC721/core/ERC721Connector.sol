// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol';

import '../../common/ERC2981Collection.sol';
import '../../../state/pause/Pause.sol';

abstract contract ERC721Connector is ERC721Enumerable, Ownable, ERC2981Collection, Pause {}
