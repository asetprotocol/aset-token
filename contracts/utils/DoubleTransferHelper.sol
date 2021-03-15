// SPDX-License-Identifier: agpl-3.0
pragma solidity ^0.7.5;

import "../interfaces/IERC20.sol";

contract DoubleTransferHelper {

    IERC20 public immutable ASET;

    constructor(IERC20 aset) public {
        ASET = aset;
    }

    function doubleSend(address to, uint256 amount1, uint256 amount2) external {
        ASET.transfer(to, amount1);
        ASET.transfer(to, amount2);
    }

}