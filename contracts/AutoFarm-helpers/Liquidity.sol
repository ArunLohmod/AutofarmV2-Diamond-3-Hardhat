// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/IUniswapV2Pair.sol";
import "./interfaces/IUniswapV2Factory.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/IPancakeRouter02.sol";

contract Liquidity is IUniswapV2Pair {
    address private constant _UNISWAP_V2_ROUTER =
        0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address private constant _FACTORY =
        0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f;

    IPancakeRouter02 private _router = IPancakeRouter02(_UNISWAP_V2_ROUTER);

    event AddLiquidity(uint256 amountA, uint256 amountB, uint256 liquidity);
    event RemoveLiquidity(
        uint256 amountA,
        uint256 amountB,
        uint256 liquidityBurned
    );

    function addLiquidity(
        address _tokenA,
        address _tokenB,
        uint256 _amountA,
        uint256 _amountB
    ) external returns (uint256 amountA, uint256 amountB, uint256 liquidity) {
        IERC20(_tokenA).transferFrom(msg.sender, address(this), _amountA);
        IERC20(_tokenB).transferFrom(msg.sender, address(this), _amountB);
        IERC20(_tokenA).approve(_UNISWAP_V2_ROUTER, _amountA);
        IERC20(_tokenB).approve(_UNISWAP_V2_ROUTER, _amountB);

        (amountA, amountB, liquidity) = _router.addLiquidity(
            _tokenA,
            _tokenB,
            _amountA,
            _amountB,
            1,
            1,
            msg.sender,
            block.timestamp
        );

        emit AddLiquidity(amountA, amountB, liquidity);
    }

    function removeLiquidity(
        address _tokenA,
        address _tokenB,
        uint256 liquidity
    ) external returns (uint256 amountA, uint256 amountB) {
        address pair = IUniswapV2Factory(_FACTORY).getPair(_tokenA, _tokenB);
        uint256 balance = IERC20(pair).balanceOf(msg.sender);
        require(balance > liquidity, "Insufficient Liquidity");
        IERC20(pair).transferFrom(msg.sender, address(this), liquidity);
        IERC20(pair).approve(_UNISWAP_V2_ROUTER, liquidity);
        (amountA, amountB) = _router.removeLiquidity(
            _tokenA,
            _tokenB,
            liquidity,
            1,
            1,
            msg.sender,
            block.timestamp
        );

        emit RemoveLiquidity(amountA, amountB, liquidity);
    }

    function getPair(
        address _tokenA,
        address _tokenB
    ) public view returns (address pair) {
        return pair = IUniswapV2Factory(_FACTORY).getPair(_tokenA, _tokenB);
    }

    function getLiquidityBalance(
        address _tokenA,
        address _tokenB,
        address whom
    ) public view returns (uint256 liquidity) {
        address pair = getPair(_tokenA, _tokenB);
        liquidity = IERC20(pair).balanceOf(whom);
    }
}
