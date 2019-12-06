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

pragma solidity ^0.4.24;

import "../lib/SafeMath.sol";
import "../components/Halt.sol";
import "./StoremanGroupStorage.sol";

contract StoremanGroupDelegate is StoremanGroupStorage, Halt {
    using SafeMath for uint;

    /**
     *
     * EVENTS
     *
     */

    /// @notice                           event for storeman register
    /// @dev                              event for storeman register
    /// @param tokenOrigAccount           token account of original chain
    /// @param storemanGroup              storemanGroup PK
    /// @param wanDeposit                 deposit wancoin number
    /// @param quota                      corresponding token quota
    /// @param txFeeRatio                 storeman fee ratio
    event StoremanGroupRegistrationLogger(bytes tokenOrigAccount, bytes storemanGroup, uint wanDeposit, uint quota, uint txFeeRatio);

    /// @notice                           event for storeman register
    /// @dev                              event for storeman register
    /// @param storemanGroup              storemanGroup PK
    /// @param isEnable                   is enable or disable
    event SetWhiteListLogger(bytes tokenOrigAccount, bytes storemanGroup, bool isEnable);

    /// @notice                           event for applying storeman group unregister
    /// @param tokenOrigAccount           token account of original chain
    /// @param storemanGroup              storemanGroup address
    /// @param applyTime                  the time for storeman applying unregister
    event StoremanGroupApplyUnRegistrationLogger(bytes tokenOrigAccount, bytes storemanGroup, uint applyTime);

    /// @notice                           event for storeman group withdraw deposit
    /// @param tokenOrigAccount           token account of original chain
    /// @param storemanGroup              storemanGroup PK
    /// @param actualReturn               the time for storeman applying unregister
    /// @param deposit                    deposit in the first place
    event StoremanGroupWithdrawLogger(bytes tokenOrigAccount, bytes storemanGroup, uint actualReturn, uint deposit);

    /// @notice                           event for storeman register
    /// @dev                              event for storeman register
    /// @param tokenOrigAccount           token account of original chain
    /// @param storemanGroup              storemanGroup PK
    /// @param wanDeposit                 deposit wancoin number
    /// @param quota                      corresponding token quota
    event StoremanGroupUpdateLogger(bytes tokenOrigAccount, bytes storemanGroup, uint wanDeposit, uint quota);

    /// @notice              Set tokenManager and htlc
    /// @param tmAddr        token manager instance address
    /// @param htlcAddr      htlc instance address
    function setDependence(address tmAddr, address htlcAddr)
        external
        onlyOwner
    {
        require(tmAddr != address(0), "Invalid tokenManager address");
        require(htlcAddr != address(0), "Invalid htlc address");
        tokenManager = ITokenManager(tmAddr);
        htlc = IHTLC(htlcAddr);
    }

    /// @notice                  enable or disable storeman group white list by owner
    /// @param isEnable          is enable
    function enableWhiteList(bool isEnable)
        external
        onlyOwner
    {
        isWhiteListEnabled = isEnable;
    }

    /// @notice                  function for setting smg white list by owner
    /// @param tokenOrigAccount  token account of original chain
    /// @param storemanGroup     storemanGroup PK for whitelist
    /// @param isEnable          enable or disable
    function setWhiteList(bytes tokenOrigAccount, bytes storemanGroup, bool isEnable)
        external
        onlyOwner
    {
        require(tokenOrigAccount.length != 0, "Invalid tokenOrigAccount");
        require(storemanGroup.length != 0, "Invalid storemanGroup");
        require(isWhiteListEnabled, "White list is disabled");
        require(whiteListMap[tokenOrigAccount][storemanGroup] != isEnable, "Duplicate set");
        if (isEnable) {
            whiteListMap[tokenOrigAccount][storemanGroup] = true;
        } else {
            delete whiteListMap[tokenOrigAccount][storemanGroup];
        }

        emit SetWhiteListLogger(tokenOrigAccount, storemanGroup, isEnable);
    }

    /// @notice                  function for storeman register by sender this method should be
    ///                          invoked by a storemanGroup registration proxy or wanchain foundation
    /// @param tokenOrigAccount  token account of original chain
    /// @param storemanGroup     the storeman group PK address
    /// @param txFeeRatio        the transaction fee required by storeman group
    function storemanGroupRegister(bytes tokenOrigAccount, bytes storemanGroup, uint txFeeRatio)
        external
        payable
        notHalted
    {
        require(tokenOrigAccount.length != 0, "Invalid tokenOrigAccount");
        require(storemanGroup.length != 0, "Invalid storemanGroup");
        require(storemanGroupMap[tokenOrigAccount][storemanGroup].deposit == 0, "Duplicate register");

        uint8 decimals;
        uint token2WanRatio;
        uint minDeposit;
        uint defaultPrecise;
        (,,decimals,,token2WanRatio,minDeposit,,defaultPrecise) = tokenManager.getTokenInfo(tokenOrigAccount);
        require(minDeposit > 0, "Token not exist");
        require(msg.value >= minDeposit, "At lease minDeposit");
        require(txFeeRatio < defaultPrecise, "Invalid txFeeRatio");
        if (isWhiteListEnabled) {
            require(whiteListMap[tokenOrigAccount][storemanGroup], "Not in white list");
            delete whiteListMap[tokenOrigAccount][storemanGroup];
        }

        uint quota = (msg.value).mul(defaultPrecise).div(token2WanRatio).mul(10**uint(decimals)).div(1 ether);
        htlc.addStoremanGroup(tokenOrigAccount, storemanGroup, quota, txFeeRatio);
        storemanGroupMap[tokenOrigAccount][storemanGroup] = StoremanGroup(msg.sender, msg.value, txFeeRatio, 0);

        emit StoremanGroupRegistrationLogger(tokenOrigAccount, storemanGroup, msg.value, quota, txFeeRatio);
    }

    /// @notice                           apply unregistration
    /// @dev                              apply unregistration
    /// @param tokenOrigAccount           token account of original chain
    /// @param storemanGroup              PK of storemanGroup
    function storemanGroupUnregister(bytes tokenOrigAccount, bytes storemanGroup)
        external
        notHalted
    {
        StoremanGroup storage smg = storemanGroupMap[tokenOrigAccount][storemanGroup];
        require(msg.sender == smg.delegate, "Sender must be delegate");
        require(smg.unregisterApplyTime == 0, "Duplicate unregister");
        smg.unregisterApplyTime = now;
        htlc.deactivateStoremanGroup(tokenOrigAccount, storemanGroup);

        emit StoremanGroupApplyUnRegistrationLogger(tokenOrigAccount, storemanGroup, now);
    }

    /// @notice                           withdraw deposit through a proxy
    /// @dev                              withdraw deposit through a proxy
    /// @param tokenOrigAccount           token account of original chain
    /// @param storemanGroup              storemanGroup PK
    function storemanGroupWithdrawDeposit(bytes tokenOrigAccount, bytes storemanGroup)
        external
        notHalted
    {
        StoremanGroup storage smg = storemanGroupMap[tokenOrigAccount][storemanGroup];
        require(msg.sender == smg.delegate, "Sender must be delegate");
        uint withdrawDelayTime;
        (,,,,,,withdrawDelayTime,) = tokenManager.getTokenInfo(tokenOrigAccount);
        require(now > smg.unregisterApplyTime.add(withdrawDelayTime), "Must wait until delay time");
        htlc.delStoremanGroup(tokenOrigAccount, storemanGroup);
        smg.delegate.transfer(smg.deposit);

        emit StoremanGroupWithdrawLogger(tokenOrigAccount, storemanGroup, smg.deposit, smg.deposit);

        delete storemanGroupMap[tokenOrigAccount][storemanGroup];
    }

    /// @notice                           append deposit through a proxy
    /// @dev                              append deposit through a proxy
    /// @param tokenOrigAccount           token account of original chain
    /// @param storemanGroup              storemanGroup PK
    function storemanGroupAppendDeposit(bytes tokenOrigAccount, bytes storemanGroup)
        external
        payable
        notHalted
    {
        require(msg.value > 0, "Value too small");
        StoremanGroup storage smg = storemanGroupMap[tokenOrigAccount][storemanGroup];
        require(msg.sender == smg.delegate, "Sender must be delegate");
        require(smg.unregisterApplyTime == 0, "Inactive");

        uint8 decimals;
        uint token2WanRatio;
        uint defaultPrecise;
        (,,decimals,,token2WanRatio,,,defaultPrecise) = tokenManager.getTokenInfo(tokenOrigAccount);
        uint deposit = smg.deposit.add(msg.value);
        uint quota = deposit.mul(defaultPrecise).div(token2WanRatio).mul(10**uint(decimals)).div(1 ether);
        htlc.updateStoremanGroup(tokenOrigAccount, storemanGroup, quota);
        // TODO: notify bonus contract
        smg.deposit = deposit;
        emit StoremanGroupUpdateLogger(tokenOrigAccount, storemanGroup, deposit, quota);
    }

    /// @notice                           apply unregistration through a proxy
    /// @dev                              apply unregistration through a proxy
    /// @param tokenOrigAccount           token account of original chain
    /// @param storemanGroup              PK of storemanGroup
    function getStoremanGroupInfo(bytes tokenOrigAccount, bytes storemanGroup)
        external
        view
        returns(address, uint, uint, uint)
    {
        StoremanGroup storage smg = storemanGroupMap[tokenOrigAccount][storemanGroup];
        return (smg.delegate, smg.deposit, smg.txFeeRatio, smg.unregisterApplyTime);
    }

    /// @notice fallback function
    function () public payable {
        revert("Not support");
    }
}