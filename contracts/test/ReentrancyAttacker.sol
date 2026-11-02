// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IBlockLuckyTarget {
    function enterLottery(uint256 quantity) external payable;
    function withdrawPrize() external;
}

/**
 * @title ReentrancyAttacker
 * @notice Contrat de TEST : tente de vider la loterie en rappelant `withdrawPrize()`
 *         pendant qu'il reçoit ses gains (attaque par réentrance).
 * @dev Scénario : il refuse l'envoi automatique pendant le tirage (ses gains sont donc crédités),
 *      puis appelle `withdrawPrize()` et essaie de le rappeler depuis `receive()`.
 *      L'échec de la tentative est enregistré pour que le test puisse le vérifier.
 */
contract ReentrancyAttacker {
    IBlockLuckyTarget public immutable lottery;

    /// @notice `true` pendant l'attaque (sinon `receive()` refuse les ETH).
    bool public attacking;
    /// @notice Nombre de tentatives de réentrance effectuées.
    uint256 public reentryAttempts;
    /// @notice Nombre de tentatives de réentrance qui ont réussi (doit rester à 0).
    uint256 public reentrySuccesses;
    /// @notice Données d'erreur renvoyées par la dernière tentative ratée.
    bytes public lastRevertData;

    constructor(address _lottery) {
        lottery = IBlockLuckyTarget(_lottery);
    }

    /// @notice Achète des tickets pour ce contrat.
    /// @param quantity Nombre de tickets.
    function enter(uint256 quantity) external payable {
        lottery.enterLottery{value: msg.value}(quantity);
    }

    /// @notice Lance l'attaque : retire ses gains et tente de les retirer une seconde fois.
    function attack() external {
        attacking = true;
        lottery.withdrawPrize();
        attacking = false;
    }

    /// @notice Pendant l'attaque, tente de rappeler `withdrawPrize()` (une seule fois).
    receive() external payable {
        require(attacking, "ReentrancyAttacker: pas maintenant");
        if (reentryAttempts == 0) {
            reentryAttempts++;
            try lottery.withdrawPrize() {
                reentrySuccesses++;
            } catch (bytes memory reason) {
                lastRevertData = reason;
            }
        }
    }
}
