// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

interface IAynn1155Folder {
  function mint(
    address _to,
    uint256 _tokenId,
    uint256 _amount,
    bytes memory _data
  ) external returns (uint256);

  function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data) external;

  function lastTokenId() external view returns (uint256);

  function contractURI() external view returns (string memory);
}
