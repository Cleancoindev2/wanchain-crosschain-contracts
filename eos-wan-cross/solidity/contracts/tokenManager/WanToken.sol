/*

  Copyright 2019 Wanchain Foundation.

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
//

pragma solidity ^0.4.24;

import '../components/StandardToken.sol';
import '../components/Owned.sol';

contract WanToken is StandardToken, Owned {
  /**************************************
   **
   ** VARIABLES
   **
   **************************************/

  string public name;
  string public symbol;
  uint8 public decimals;

  /****************************************************************************
   **
   ** MODIFIERS
   **
   ****************************************************************************/
  modifier onlyMeaningfulValue(uint value) {
      require(value > 0, "Value is null");
      _;
  }

  /****************************************************************************
   **
   ** EVENTS
   **
   ****************************************************************************/
  /// @notice Logger for token mint
  /// @dev Logger for token mint
  /// @param account Whom these token will be minted to
  /// @param value Amount of ETH/WETH to be minted
  /// @param totalSupply Total amount of WETH after token mint
  event TokenMintedLogger(
    address indexed account,
    uint indexed value,
    uint indexed totalSupply
  );

  /// @notice Logger for token burn
  /// @dev Logger for token burn
  /// @param account Initiator address
  /// @param value Amount of WETH to be burnt
  /// @param totalSupply Total amount of WETH after token burn
  event TokenBurntLogger(
    address indexed account,
    uint indexed value,
    uint indexed totalSupply
  );

  ///@notice Initialize the TokenManager address
  ///@dev Initialize the TokenManager address
  ///@param tokenName The token name to be used
  ///@param tokenSymbol The token symbol to be used
  ///@param tokenDecimal The token decimals to be used
  constructor(string tokenName, string tokenSymbol, uint8 tokenDecimal)
    public
  {
      name = tokenName;
      symbol = tokenSymbol;
      decimals = tokenDecimal;
  }

  /// @notice If WAN coin is sent to this address, send it back.
  /// @dev If WAN coin is sent to this address, send it back.
  function() public payable {
    revert("Not support");
  }

  /****************************************************************************
   **
   ** MANIPULATIONS
   **
   ****************************************************************************/

  /// @notice Create token
  /// @dev Create token
  /// @param account Address will receive token
  /// @param value Amount of token to be minted
  /// @return True if successful
  function mint(address account, uint value)
    public
    onlyOwner
    onlyMeaningfulValue(value)
    returns (bool)
  {
    require(account != address(0), "Account is null");

    balances[account] = balances[account].add(value);
    totalSupply = totalSupply.add(value);

    emit TokenMintedLogger(account, value, totalSupply);
    return true;
  }

  /// @notice Burn token
  /// @dev Burn token
  /// @param account Address of whose token will be burnt
  /// @param value Amount of token to be burnt
  /// @return True if successful
  function burn(address account, uint value)
    public
    onlyOwner
    onlyMeaningfulValue(value)
    returns (bool)
  {
    balances[account] = balances[account].sub(value);
    totalSupply = totalSupply.sub(value);

    emit TokenBurntLogger(account, value, totalSupply);
    return true;
  }

}