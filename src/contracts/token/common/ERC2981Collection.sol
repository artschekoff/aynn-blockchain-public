// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.0 <0.9.0;

import '@openzeppelin/contracts/utils/introspection/ERC165.sol';
import '@openzeppelin/contracts/interfaces/IERC2981.sol';

// File contracts/eip/2981/ERC2981Collection.sol
/***
 *    ███████╗██████╗  ██████╗██████╗  █████╗  █████╗  ██╗
 *    ██╔════╝██╔══██╗██╔════╝╚════██╗██╔══██╗██╔══██╗███║
 *    █████╗  ██████╔╝██║      █████╔╝╚██████║╚█████╔╝╚██║
 *    ██╔══╝  ██╔══██╗██║     ██╔═══╝  ╚═══██║██╔══██╗ ██║
 *    ███████╗██║  ██║╚██████╗███████╗ █████╔╝╚█████╔╝ ██║
 *    ╚══════╝╚═╝  ╚═╝ ╚═════╝╚══════╝ ╚════╝  ╚════╝  ╚═╝
 *
 *     ██████╗ ██████╗ ██╗     ██╗     ███████╗ ██████╗████████╗██╗ ██████╗ ███╗   ██╗
 *    ██╔════╝██╔═══██╗██║     ██║     ██╔════╝██╔════╝╚══██╔══╝██║██╔═══██╗████╗  ██║
 *    ██║     ██║   ██║██║     ██║     █████╗  ██║        ██║   ██║██║   ██║██╔██╗ ██║
 *    ██║     ██║   ██║██║     ██║     ██╔══╝  ██║        ██║   ██║██║   ██║██║╚██╗██║
 *    ╚██████╗╚██████╔╝███████╗███████╗███████╗╚██████╗   ██║   ██║╚██████╔╝██║ ╚████║
 *     ╚═════╝ ╚═════╝ ╚══════╝╚══════╝╚══════╝ ╚═════╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝
 */

abstract contract ERC2981Collection is IERC2981, ERC165 {
  address private royaltyAddress;
  uint256 private royaltyFeesInBips;

  event royalatiesSet(uint256 value, address recipient);
  error UnauthorizedERC2981();

  function calculateRoyalty(uint256 _salePrice) public view returns (uint256) {
    return (_salePrice * royaltyFeesInBips) / 10000;
  }

  // Set to be internal function _setRoyalties
  function _setRoyalties(address _receiver, uint256 _feesInBips) internal {
    if (_feesInBips > 10001 || _feesInBips <= 0) {
      revert UnauthorizedERC2981();
    }

    royaltyAddress = _receiver;
    royaltyFeesInBips = _feesInBips;

    emit royalatiesSet(royaltyFeesInBips, royaltyAddress);
  }

  // Override for royaltyInfo(uint256, uint256)
  // https://www.gemini.com/blog/exploring-the-nft-royalty-standard-eip-2981 - explains
  // why we use 10000 divider
  function royaltyInfo(
    uint256 _tokenId,
    uint256 _salePrice
  ) public view override(IERC2981) returns (address receiver, uint256 royaltyAmount) {
    receiver = royaltyAddress;
    royaltyAmount = calculateRoyalty(_salePrice);
  }
}
