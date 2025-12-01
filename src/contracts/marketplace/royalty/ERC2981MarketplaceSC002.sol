// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import '@openzeppelin/contracts/interfaces/IERC20.sol';
import '@openzeppelin/contracts/interfaces/IERC2981.sol';

/***
 * ERC2981
 */
abstract contract ERC2981MarketplaceSC002 {
  address internal royaltyAddress;
  // after setup increases to 5
  // if user _nonce match rule _nonce % nonce == 0 - user doesn't pay
  // marketplace fee
  uint256 internal nonce;

  mapping(RoyaltyType => uint256) _royalties;

  enum RoyaltyType {
    PERCENT,
    OFFER,
    LISTING
  }

  struct RoyaltyMeta {
    RoyaltyType royaltyType;
    uint256 price;
    uint256 nonce;
  }

  event RoyalatiesSet(uint256 value, address recipient);

  error UnauthorizedERC2981();

  function calculateRoyalty(
    uint256 _salePrice,
    RoyaltyType _royaltyType
  ) public view returns (uint256) {
    if (_royaltyType == RoyaltyType.PERCENT) {
      return (_salePrice * _royalties[_royaltyType]) / 10000;
    } else if (_royaltyType == RoyaltyType.OFFER || _royaltyType == RoyaltyType.LISTING) {
      return _royalties[_royaltyType];
    } else {
      revert UnauthorizedERC2981();
    }
  }

  function _setNonce(uint256 _nonce) internal {
    nonce = _nonce + 5;
  }

  // Set to be internal function _setRoyalties
  // amount 0;100%
  function _setRoyalties(address _receiver, RoyaltyType _royaltyType, uint256 _value) internal {
    if (_royaltyType == RoyaltyType.PERCENT) {
      // value is in bips here (%)
      if (_value > 1001 || _value <= 0) {
        revert UnauthorizedERC2981();
      }

      _royalties[RoyaltyType.PERCENT] = _value;
    } else {
      // value is fixed here
      _royalties[_royaltyType] = _value;
    }

    royaltyAddress = _receiver;

    emit RoyalatiesSet(_value, royaltyAddress);
  }

  function royaltyInfo(
    RoyaltyMeta memory _royaltyMeta
  ) public view returns (address receiver, uint256 royaltyAmount) {
    receiver = royaltyAddress;
    royaltyAmount = _royaltyMeta.nonce != 0 && _royaltyMeta.nonce % nonce == 0
      ? 0
      : calculateRoyalty(_royaltyMeta.price, _royaltyMeta.royaltyType);
  }

  function _getPriceWithRoyalties(
    address _nft,
    uint256 _tokenId,
    RoyaltyMeta memory _royaltyMeta
  ) internal view returns (uint256) {
    uint256 totalPrice = _royaltyMeta.price;

    // collecting royalty from marketplace contract itself
    (, uint256 marketplaceRoyalty) = royaltyInfo(_royaltyMeta);
    totalPrice += marketplaceRoyalty;

    // respecting ERC2981Royalties also (if supports)
    if (IERC721(_nft).supportsInterface(type(IERC2981).interfaceId)) {
      (, uint256 nftRoyalty) = IERC2981(_nft).royaltyInfo(_tokenId, _royaltyMeta.price);
      totalPrice += nftRoyalty;
    }

    return totalPrice;
  }

  function _transferMarketplaceRoyalty(
    RoyaltyMeta memory _royaltyMeta
  ) internal returns (address, uint256) {
    (, uint256 marketplaceRoyalty) = royaltyInfo(_royaltyMeta);
    (bool sent, ) = payable(royaltyAddress).call{value: marketplaceRoyalty}('');
    require(sent, 'Should pay marketplace royalty');
    // IERC20(_payToken).transferFrom(msg.sender, royaltyAddress, royaltyAmount);
    return (royaltyAddress, marketplaceRoyalty);
  }

  function _getERC2981Royalties(
    address _nft,
    uint256 _tokenId,
    uint256 _price
  ) internal view returns (address, uint256) {
    if (IERC721(_nft).supportsInterface(type(IERC2981).interfaceId)) {
      return IERC2981(address(_nft)).royaltyInfo(_tokenId, _price);
    } else {
      return (address(0), 0);
    }
  }

  function _transferERC2981Royalties(
    address _nft,
    uint256 _tokenId,
    uint256 _price
  ) internal returns (address, uint256) {
    if (IERC721(_nft).supportsInterface(type(IERC2981).interfaceId)) {
      (address nftReceiver, uint256 nftAmount) = IERC2981(_nft).royaltyInfo(_tokenId, _price);
      // IERC20(_payToken).transferFrom(msg.sender, receiver, amount);
      (bool sent, ) = payable(nftReceiver).call{value: nftAmount}('');
      require(sent, 'Should pay 721 royalties');
      return (nftReceiver, nftAmount);
    } else {
      return (address(0), 0);
    }
  }
}
