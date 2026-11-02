// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IBlockLuckyPlayer {
    function enterLottery(uint256 quantity) external payable;
    function withdrawPrize() external;
}

/**
 * @title RejectEther
 * @notice Contrat de TEST : un joueur qui refuse les ETH tant qu'on ne l'autorise pas.
 * @dev Sert à vérifier que la loterie ne se bloque pas si l'envoi automatique des gains échoue :
 *      les gains doivent être crédités, puis récupérables avec `withdrawPrize()`.
 */
contract RejectEther {
    /// @notice Si `false`, toute réception d'ETH échoue.
    bool public acceptEther;

    /// @notice Achète des tickets pour ce contrat.
    /// @param lottery Adresse de la loterie.
    /// @param quantity Nombre de tickets.
    function enter(address lottery, uint256 quantity) external payable {
        IBlockLuckyPlayer(lottery).enterLottery{value: msg.value}(quantity);
    }

    /// @notice Autorise ou refuse la réception d'ETH.
    /// @param accept Nouvelle valeur.
    function setAcceptEther(bool accept) external {
        acceptEther = accept;
    }

    /// @notice Récupère les gains mis de côté par la loterie.
    /// @param lottery Adresse de la loterie.
    function withdraw(address lottery) external {
        IBlockLuckyPlayer(lottery).withdrawPrize();
    }

    /// @notice Refuse les ETH tant que `acceptEther` vaut `false`.
    receive() external payable {
        require(acceptEther, "RejectEther: ETH refuses");
    }
}
