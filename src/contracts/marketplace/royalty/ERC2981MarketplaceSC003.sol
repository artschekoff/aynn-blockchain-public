// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import '@openzeppelin/contracts/interfaces/IERC20.sol';
import '@openzeppelin/contracts/interfaces/IERC2981.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/utils/introspection/ERC165Checker.sol';
import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';

import './core/ERC2981MarketplaceLib.sol';
import './core/ERC2981MarketplaceConnector.sol';
import './core/IERC2981Marketplace.sol';

import '../../security/signature/SignatureLib.sol';

/***
 * ERC2981
 */
abstract contract ERC2981MarketplaceSC003 is ERC2981MarketplaceConnector, IERC2981Marketplace {
  using ECDSA for bytes32;
  bytes4 public constant IID_IERC2981 = type(IERC2981).interfaceId;

  address internal royaltyAddress;
  // after setup increases to 5
  // if user _nonce match rule _nonce % nonce == 0 - user doesn't pay
  // marketplace fee
  mapping(ERC2981MarketplaceLib.RoyaltyType => uint256) _royalties;

  event RoyalatiesSet(uint256 value, address recipient);

  error UnauthorizedERC2981();

  function getDiscountValue(
    SignatureLib.NonceRequest memory _nonce,
    ERC2981MarketplaceLib.RoyaltyType _royaltyType
  ) internal view returns (uint256) {
    if (_nonce.signature.length > 0) {
      //       bytes32 messageHash = keccak256(abi.encode(_nonce.nonce));
      //
      //       bytes32 ethHash = ECDSA.toEthSignedMessageHash(messageHash);
      //       address recoveredNonce = ECDSA.recover(ethHash, _nonce.signature);

      if (_isValidNonceRequest(_nonce)) {
        // in case of percent, we passed bignumber, but need to transform it
        // in bips for percentage operations
        if (_royaltyType == ERC2981MarketplaceLib.RoyaltyType.PERCENT) {
          return _nonce.nonce / 10000000000000000;
        }

        return _nonce.nonce;
      }
    }

    return _royalties[_royaltyType];
  }

  function calculateRoyalty(
    ERC2981MarketplaceLib.RoyaltyMeta memory _royaltyMeta
  ) public view returns (uint256) {
    uint256 nonceValue = getDiscountValue(_royaltyMeta.nonce, _royaltyMeta.royaltyType);

    if (_royaltyMeta.royaltyType == ERC2981MarketplaceLib.RoyaltyType.PERCENT) {
      return ((_royaltyMeta.price * nonceValue) / 10000) * _royaltyMeta.value;
    } else if (
      _royaltyMeta.royaltyType == ERC2981MarketplaceLib.RoyaltyType.OFFER ||
      _royaltyMeta.royaltyType == ERC2981MarketplaceLib.RoyaltyType.LISTING
    ) {
      return nonceValue * _royaltyMeta.value;
    } else {
      revert UnauthorizedERC2981();
    }
  }

  function royaltyInfo(
    ERC2981MarketplaceLib.RoyaltyMeta memory _royaltyMeta
  ) public view override returns (address receiver, uint256 royaltyAmount) {
    receiver = royaltyAddress;

    // royaltyAmount = _royaltyMeta.nonce == 0 || nonce % _royaltyMeta.nonce != 0
    //   ? calculateRoyalty(_royaltyMeta.price, _royaltyMeta.value, _royaltyMeta.royaltyType)
    //   : 0;

    royaltyAmount = calculateRoyalty(_royaltyMeta);
  }

  function _getPriceWithRoyalties(
    address _nft,
    uint256 _tokenId,
    ERC2981MarketplaceLib.RoyaltyMeta memory _royaltyMeta,
    ERC2981MarketplaceLib.RoyaltyAction _royaltyAction
  ) internal view returns (uint256) {
    uint256 totalPrice = _royaltyMeta.price * _royaltyMeta.value;

    // collecting royalty from marketplace contract itself
    (, uint256 marketplaceRoyalty) = royaltyInfo(_royaltyMeta);

    // respecting ERC2981Royalties also (if supports)
    uint256 nftRoyalty = 0;
    if (ERC165Checker.supportsInterface(_nft, IID_IERC2981)) {
      (, nftRoyalty) = IERC2981(_nft).royaltyInfo(
        _tokenId,
        _royaltyMeta.price * _royaltyMeta.value
      );
    }

    if (_royaltyAction == ERC2981MarketplaceLib.RoyaltyAction.PLUS) {
      totalPrice = totalPrice + marketplaceRoyalty + nftRoyalty;
    } else if (_royaltyAction == ERC2981MarketplaceLib.RoyaltyAction.MINUS) {
      totalPrice = totalPrice - marketplaceRoyalty - nftRoyalty;
    } else {
      revert ERC2981MarketplaceLib.RoyaltiesError();
    }

    return totalPrice;
  }

  function _transferMarketplaceRoyalty(
    ERC2981MarketplaceLib.RoyaltyMeta memory _royaltyMeta
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
    if (ERC165Checker.supportsInterface(_nft, IID_IERC2981)) {
      return IERC2981(address(_nft)).royaltyInfo(_tokenId, _price);
    } else {
      return (address(0), 0);
    }
  }

  function _transferERC2981Royalties(
    address _nft,
    uint256 _tokenId,
    uint256 _price,
    uint256 _value
  ) internal returns (address, uint256) {
    // if (IERC721(_nft).supportsInterface(type(IERC2981).interfaceId)) {
    if (ERC165Checker.supportsInterface(_nft, IID_IERC2981)) {
      (address nftReceiver, uint256 nftAmount) = IERC2981(_nft).royaltyInfo(
        _tokenId,
        _price * _value
      );

      // IERC20(_payToken).transferFrom(msg.sender, receiver, amount);
      (bool sent, ) = payable(nftReceiver).call{value: nftAmount}('');

      require(sent, 'Should pay 2981 royalties');

      return (nftReceiver, nftAmount);
    } else {
      return (address(0), 0);
    }
  }

  function getRoyaltyAddress() external view override onlyOwner returns (address) {
    return royaltyAddress;
  }

  /// @notice area ROYALTIES
  ////////////////////////////////////
  // Set to be internal function _setRoyalties
  // amount 0;100%
  function _setRoyalties(
    address _receiver,
    ERC2981MarketplaceLib.RoyaltyType _royaltyType,
    uint256 _value
  ) internal {
    if (_royaltyType == ERC2981MarketplaceLib.RoyaltyType.PERCENT) {
      // value is in bips here (%)
      if (_value <= 0) {
        revert UnauthorizedERC2981();
      }

      _royalties[ERC2981MarketplaceLib.RoyaltyType.PERCENT] = _value;
    } else {
      // value is fixed here
      _royalties[_royaltyType] = _value;
    }

    royaltyAddress = _receiver;

    emit RoyalatiesSet(_value, royaltyAddress);
  }

  /// @notice Allows to set the royalties on the contract
  /// @dev This function in a real contract should be protected with a onlyOwner (or equivalent) modifier
  /// @param _royaltyRecipient the royalties recipient
  /// @param _royaltyFeePercent percent * 100 (20% * 100 = 2000)
  /// @param _royaltyFeeListing fee for fixed-price operations
  /// @param _royaltyFeeOffer fee for fixed-price operations
  function setRoyalties(
    address _royaltyRecipient,
    uint256 _royaltyFeePercent,
    uint256 _royaltyFeeListing,
    uint256 _royaltyFeeOffer
  ) external override onlyOwner {
    _setRoyalties(_royaltyRecipient, ERC2981MarketplaceLib.RoyaltyType.PERCENT, _royaltyFeePercent);
    _setRoyalties(_royaltyRecipient, ERC2981MarketplaceLib.RoyaltyType.LISTING, _royaltyFeeListing);
    _setRoyalties(_royaltyRecipient, ERC2981MarketplaceLib.RoyaltyType.OFFER, _royaltyFeeOffer);
  }
}
