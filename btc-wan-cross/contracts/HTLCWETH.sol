/*

  Copyright 2018 Wanchain Foundation.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.

*/

//                            _           _           _
//  __      ____ _ _ __   ___| |__   __ _(_)_ __   __| | _____   __
//  \ \ /\ / / _` | '_ \ / __| '_ \ / _` | | '_ \@/ _` |/ _ \ \ / /
//   \ V  V / (_| | | | | (__| | | | (_| | | | | | (_| |  __/\ V /
//    \_/\_/ \__,_|_| |_|\___|_| |_|\__,_|_|_| |_|\__,_|\___| \_/
//
//  Code style according to: https://github.com/wanchain/wanchain-token/blob/master/style-guide.rst

pragma solidity ^0.4.24;

import "./HTLCBase.sol";
import "./AdminInterface.sol";
import "./WTokenManagerInterface.sol";



contract HTLCWETH is HTLCBase {

    /**
    *
    * VARIABLES
    *
    */

    /// @notice weth manager address
    address public wethManager;

    /// @notice storeman group admin address
    address public storemanGroupAdmin;

    address public coinAdmin;

    /// @notice transaction fee
    mapping(bytes32 => uint) public mapXHashFee;

    /// @notice token index of WETH
    uint public constant ETH_INDEX = 0;

    /**
    *
    * EVENTS
    *
    **/

    /// @notice            event of exchange WETH with ETH request
    /// @param storeman    address of storeman
    /// @param wanAddr     address of wanchain, used to receive WETH
    /// @param xHash       hash of HTLC random number
    /// @param value       HTLC value
    event ETH2WETHLock(address indexed storeman, address indexed wanAddr, bytes32 indexed xHash, uint value);
    /// @notice            event of redeem WETH from exchange WETH with ETH HTLC transaction
    /// @param wanAddr     address of user on wanchain, used to receive WETH
    /// @param storeman    address of storeman, the WETH minter
    /// @param xHash       hash of HTLC random number
    /// @param x           HTLC random number
    event ETH2WETHRedeem(address indexed wanAddr, address indexed storeman, bytes32 indexed xHash, bytes32 x);
    /// @notice            event of revoke exchange WETH with ETH HTLC transaction
    /// @param storeman    address of storeman
    /// @param xHash       hash of HTLC random number
    event ETH2WETHRevoke(address indexed storeman, bytes32 indexed xHash);
    /// @notice            event of exchange ETH with WETH request
    /// @param wanAddr     address of user, where the WETH come from
    /// @param storeman    address of storeman, where the ETH come from
    /// @param xHash       hash of HTLC random number
    /// @param value       exchange value
    /// @param ethAddr     address of ethereum, used to receive ETH
    /// @param fee         exchange fee
    event WETH2ETHLock(address indexed wanAddr, address indexed storeman, bytes32 indexed xHash, uint value, address ethAddr, uint fee);
    /// @notice            event of redeem WETH from exchange ETH with WETH HTLC transaction
    /// @param storeman    address of storeman, used to receive WETH
    /// @param wanAddr     address of user, where the WETH come from
    /// @param xHash       hash of HTLC random number
    /// @param x           HTLC random number
    event WETH2ETHRedeem(address indexed storeman, address indexed wanAddr, bytes32 indexed xHash, bytes32 x);
    /// @notice            event of revoke exchange ETH with WETH HTLC transaction
    /// @param wanAddr     address of user
    /// @param xHash       hash of HTLC random number
    event WETH2ETHRevoke(address indexed wanAddr, bytes32 indexed xHash);

    /**
    *
    * MODIFIERS
    *
    */

    /// @dev Check WETHManager address must be initialized before call its method
    modifier initialized() {
        require(wethManager != address(0));
        require(storemanGroupAdmin != address(0));
        _;
    }

    /**
    *
    * MANIPULATIONS
    *
    */


    /// @notice         set weth manager SC address(only owner have the right)
    /// @param  addr    weth manager SC address
    function setWETHManager(address addr)
        public
        onlyOwner
        isHalted
        returns (bool)
    {
        require(addr != address(0));
        wethManager = addr;
        return true;
    }

    /// @notice         set storeman group admin SC address(only owner have the right)
    /// @param  smgAdminAddr    storeman group admin SC address
    function setAdmin(address smgAdminAddr,address coinAdminAddr)
        public
        onlyOwner
        isHalted
        returns (bool)
    {
        require(smgAdminAddr != address(0));
        require(coinAdminAddr != address(0));

        storemanGroupAdmin = smgAdminAddr;
        coinAdmin = coinAdminAddr;

        return true;
    }

    /// @notice         request exchange WETH with ETH(to prevent collision, x must be a 256bit random bigint)
    /// @param xHash    hash of HTLC random number
    /// @param wanAddr  address of user, used to receive WETH
    /// @param value    exchange value
    function eth2wethLock(bytes32 xHash, address wanAddr, uint value)
        public
        initialized
        notHalted
        returns(bool)
    {
        addHTLCTx(TxDirection.Coin2Wtoken, msg.sender, wanAddr, xHash, value, false, address(0x00));
        if (!WTokenManagerInterface(wethManager).lockQuota(msg.sender, wanAddr, value)) {
            revert();
        }

        emit ETH2WETHLock(msg.sender, wanAddr, xHash, value);
        return true;
    }

    /// @notice  redeem WETH from the HTLC transaction of exchange WETH with ETH(must be called before HTLC timeout)
    /// @param x HTLC random number
    function eth2wethRedeem(bytes32 x)
        public
        initialized
        notHalted
        returns(bool)
    {
        bytes32 xHash = keccak256(x);
        redeemHTLCTx(xHash, TxDirection.Coin2Wtoken);
        HTLCTx storage info = mapXHashHTLCTxs[xHash];
        if (!WTokenManagerInterface(wethManager).mintToken(info.source, info.destination, info.value)) {
            revert();
        }

        emit ETH2WETHRedeem(info.destination, info.source, xHash, x);
        return true;
    }

    /// @notice revoke HTLC transaction of exchange WETH with ETH(must be called after HTLC timeout)
    /// @param  xHash  hash of HTLC random number
    function eth2wethRevoke(bytes32 xHash)
        public
        initialized
        notHalted
        returns(bool)
    {
        revokeHTLCTx(xHash, TxDirection.Coin2Wtoken, false);
        HTLCTx storage info = mapXHashHTLCTxs[xHash];
        if (!WTokenManagerInterface(wethManager).unlockQuota(info.source, info.value)) {
            revert();
        }

        emit ETH2WETHRevoke(info.source, xHash);
        return true;
    }

    /// @notice         request exchange ETH with WETH(to prevent collision, x must be a 256bit random bigint)
    /// @param xHash    hash of HTLC random number
    /// @param storeman address of storeman, where the ETH come from
    /// @param ethAddr  address of ethereum, used to receive ETH
    /// @param value    exchange value
    function weth2ethLock(bytes32 xHash, address storeman, address ethAddr, uint value)
        public
        initialized
        notHalted
        payable
        returns(bool)
    {
        require(tx.origin == msg.sender);

        // check withdraw fee
        uint fee = getWeth2EthFee(storeman, value);
        require(msg.value >= fee);

        addHTLCTx(TxDirection.Wtoken2Coin, msg.sender, storeman, xHash, value, true, ethAddr);
        if (!WTokenManagerInterface(wethManager).lockToken(storeman, msg.sender, value)) {
            revert();
        }

        mapXHashFee[xHash] = fee;

        // restore the extra cost
        uint left = msg.value.sub(fee);
        if (left != 0) {
            msg.sender.transfer(left);
        }

        emit WETH2ETHLock(msg.sender, storeman, xHash, value, ethAddr, fee);
        return true;
    }

    /// @notice  redeem WETH from the HTLC transaction of exchange ETH with WETH(must be called before HTLC timeout)
    /// @param x HTLC random number
    function weth2ethRedeem(bytes32 x)
        public
        initialized
        notHalted
        returns(bool)
    {
        bytes32 xHash = keccak256(x);
        redeemHTLCTx(xHash, TxDirection.Wtoken2Coin);
        HTLCTx storage info = mapXHashHTLCTxs[xHash];
        if (!WTokenManagerInterface(wethManager).burnToken(info.destination, info.value)) {
            revert();
        }

        info.destination.transfer(mapXHashFee[xHash]);
        emit WETH2ETHRedeem(info.destination, info.source, xHash, x);
        return true;
    }

    /// @notice        revoke HTLC transaction of exchange ETH with WETH(must be called after HTLC timeout)
    /// @notice        the revoking fee will be sent to storeman
    /// @param  xHash  hash of HTLC random number
    function weth2ethRevoke(bytes32 xHash)
        public
        initialized
        notHalted
        returns(bool)
    {
        revokeHTLCTx(xHash, TxDirection.Wtoken2Coin, true);
        HTLCTx storage info = mapXHashHTLCTxs[xHash];
        if (!WTokenManagerInterface(wethManager).unlockToken(info.destination, info.source, info.value)) {
            revert();
        }

        uint revokeFee = mapXHashFee[xHash].mul(revokeFeeRatio).div(RATIO_PRECISE);
        uint left = mapXHashFee[xHash].sub(revokeFee);

        if (revokeFee > 0) {
            info.destination.transfer(revokeFee);
        }

        if (left > 0) {
            info.source.transfer(left);
        }

        emit WETH2ETHRevoke(info.source, xHash);
        return true;
    }

    /// @notice          getting weth 2 eth fee
    /// @param  storeman address of storeman
    /// @param  value    HTLC tx value
    /// @return          needful fee
    function getWeth2EthFee(address storeman, uint value)
        public
        view
        returns(uint)
    {
        CoinAdminInterface cadmin = CoinAdminInterface(coinAdmin);
        uint defaultPrecise = cadmin.DEFAULT_PRECISE();
        var (coin2WanRatio,,,,,,,,,,,) = cadmin.mapCoinInfo(ETH_INDEX);

        SmgAdminInterface smga = SmgAdminInterface(storemanGroupAdmin);
        var (,,,txFeeratio,,,) = smga.mapCoinSmgInfo(ETH_INDEX, storeman);
        return value.mul(coin2WanRatio).mul(txFeeratio).div(defaultPrecise).div(defaultPrecise);
    }


}