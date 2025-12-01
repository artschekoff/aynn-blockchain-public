// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import '@openzeppelin/contracts/interfaces/IERC20.sol';
import '@openzeppelin/contracts/interfaces/IERC2981.sol';

/***
 * ERC2981
 */
abstract contract ERC2981Marketplace {
  address internal royaltyAddress;
  uint256 internal royaltyFeesInBips;

  event royalatiesSet(uint256 value, address recipient);

  error UnauthorizedERC2981();

  function calculateRoyalty(uint256 _salePrice) public view returns (uint256) {
    return (_salePrice * royaltyFeesInBips) / 10000;
  }

  // Set to be internal function _setRoyalties
  // amount 0;100%
  function _setRoyalties(address _receiver, uint256 _feesInBips) internal {
    if (_feesInBips > 1001 || _feesInBips <= 0) {
      revert UnauthorizedERC2981();
    }

    royaltyAddress = _receiver;
    royaltyFeesInBips = _feesInBips;

    emit royalatiesSet(royaltyFeesInBips, royaltyAddress);
  }

  function royaltyInfo(
    uint256 _tokenId,
    uint256 _salePrice
  ) public view returns (address receiver, uint256 royaltyAmount) {
    receiver = royaltyAddress;
    royaltyAmount = calculateRoyalty(_salePrice);
  }

  function _getPriceWithRoyalties(
    address _nft,
    uint256 _tokenId,
    uint256 _price
  ) internal view returns (uint256) {
    uint256 totalPrice = _price;

    // collecting royalty from marketplace contract itself
    (, uint256 royaltyAmount) = royaltyInfo(_tokenId, _price);
    totalPrice += royaltyAmount;

    // respecting ERC2981Royalties also (if supports)
    if (IERC721(_nft).supportsInterface(0x2a55205a)) {
      (, uint256 nftRoyaltyAmount) = IERC2981(_nft).royaltyInfo(_tokenId, _price);
      totalPrice += nftRoyaltyAmount;
    }

    return totalPrice;
  }

  function _transferMarketplaceRoyalty(
    address _nft,
    uint256 _tokenId,
    address _payToken,
    uint256 _price
  ) internal returns (address receiver, uint256 amount) {
    (, uint256 royaltyAmount) = royaltyInfo(_tokenId, _price);
    IERC20(_payToken).transferFrom(msg.sender, royaltyAddress, royaltyAmount);
    return (royaltyAddress, royaltyAmount);
  }

  function _getERC2981Royalties(
    address _nft,
    uint256 _tokenId,
    uint256 _price
  ) internal view returns (address, uint256) {
    if (IERC721(_nft).supportsInterface(0x2155205a)) {
      return IERC2981(address(_nft)).royaltyInfo(_tokenId, _price);
    } else {
      return (address(0), 0);
    }
  }

  function _transferERC2981Royalties(
    address _nft,
    uint256 _tokenId,
    address _payToken,
    uint256 _price
  ) internal returns (address, uint256) {
    if (IERC721(_nft).supportsInterface(0x2155205a)) {
      (address receiver, uint256 amount) = IERC2981(_nft).royaltyInfo(_tokenId, _price);
      IERC20(_payToken).transferFrom(msg.sender, receiver, amount);
      return (receiver, amount);
    } else {
      return (address(0), 0);
    }
  }
}
