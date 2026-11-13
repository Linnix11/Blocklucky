// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable, Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IVRFCoordinatorV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/interfaces/IVRFCoordinatorV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

/**
 * @title BlockLucky
 * @author Équipe BlockLucky (Epitech Digital School) pour la ville d'EtherBay
 * @notice Loterie des fêtes de fin d'année d'EtherBay. Les participants achètent des tickets,
 *         puis un gagnant est tiré au sort grâce à Chainlink VRF v2.5 (hasard vérifiable)
 *         et reçoit 100 % de la cagnotte. Tout est public et vérifiable sur la blockchain.
 * @dev Choix de sécurité importants :
 *      - La mairie (`owner`) peut seulement ouvrir une loterie (`startNewRound`). Elle ne peut
 *        ni choisir le gagnant, ni retirer de fonds : aucune fonction ne le permet.
 *      - On n'hérite volontairement PAS de `VRFConsumerBaseV2Plus` : ce contrat de Chainlink
 *        contient `setCoordinator()`, appelable par le propriétaire et non surchargeable
 *        (pas `virtual`). La mairie pourrait y brancher un faux coordinateur et choisir le
 *        gagnant. Ici, l'adresse du coordinateur est `immutable` : personne ne peut la changer.
 *      - Les tickets de chaque loterie sont rangés dans un tableau propre à la loterie
 *        (`_tickets[roundId]`) : ouvrir une nouvelle loterie ne demande aucune boucle, même
 *        avec 10 000 participants.
 */
contract BlockLucky is Ownable2Step, ReentrancyGuard {
    // =============================================================
    //                            TYPES
    // =============================================================

    /// @notice Les trois états possibles d'une loterie.
    /// @dev CLOSED : aucune loterie en cours. OPEN : vente de tickets. CALCULATING : tirage en attente de VRF.
    enum LotteryState {
        CLOSED,
        OPEN,
        CALCULATING
    }

    /// @notice Résultat public d'une loterie terminée (historique).
    /// @param winner Adresse du gagnant (adresse zéro si personne n'a joué).
    /// @param prize Montant gagné, en wei.
    /// @param timestamp Date du tirage (secondes Unix).
    /// @param ticketsSold Nombre de tickets vendus pendant cette loterie.
    struct RoundResult {
        address winner;
        uint256 prize;
        uint256 timestamp;
        uint256 ticketsSold;
    }

    // =============================================================
    //                    CONSTANTES CHAINLINK VRF
    // =============================================================

    /// @notice Gas maximum accordé à Chainlink pour exécuter `fulfillRandomWords`.
    /// @dev Mesuré sur Sepolia (13/11/2026) : ~510 000 gas, ~620 000 si les gains sont crédités.
    ///      Sepolia facture désormais les nouvelles cases mémoire bien plus cher qu'en local (~130 000).
    uint32 public constant CALLBACK_GAS_LIMIT = 800_000;

    /// @notice Nombre de blocs attendus avant que Chainlink ne réponde (protection contre les réorganisations).
    uint16 public constant REQUEST_CONFIRMATIONS = 3;

    /// @notice Nombre de nombres aléatoires demandés (un seul suffit).
    uint32 public constant NUM_WORDS = 1;

    /// @notice Gas transmis lors de l'envoi automatique des gains au gagnant.
    /// @dev Limité pour qu'un gagnant malveillant (contrat) ne puisse pas consommer tout le gas
    ///      du tirage et bloquer la loterie. En cas d'échec, les gains sont crédités (voir `withdrawPrize`).
    uint256 public constant PAYOUT_GAS_LIMIT = 50_000;

    /// @notice Délai après lequel n'importe qui peut relancer un tirage resté sans réponse de Chainlink.
    /// @dev Chainlink répond normalement en quelques minutes. Ce délai évite qu'une cagnotte reste
    ///      bloquée pour toujours si VRF ne répond pas (ex. souscription sans LINK).
    uint256 public constant DRAW_TIMEOUT = 1 hours;

    // =============================================================
    //                       PARAMÈTRES VRF
    // =============================================================

    /// @notice Coordinateur Chainlink VRF v2.5. Fixé au déploiement, impossible à modifier.
    IVRFCoordinatorV2Plus public immutable vrfCoordinator;

    /// @notice Identifiant de la souscription Chainlink VRF qui paie les tirages.
    uint256 public immutable subscriptionId;

    /// @notice Identifiant de la « voie » de gas Chainlink (keyHash).
    bytes32 public immutable keyHash;

    // =============================================================
    //                       ÉTAT DE LA LOTERIE
    // =============================================================

    /// @notice État de la loterie en cours (CLOSED au déploiement).
    LotteryState public state;

    /// @notice Numéro de la loterie en cours (augmente de 1 à chaque ouverture).
    uint256 public roundId;

    /// @notice Prix d'un ticket, en wei.
    uint256 public ticketPrice;

    /// @notice Nombre de participants (adresses différentes) qui déclenche la fin de la loterie.
    uint256 public maxParticipants;

    /// @notice Nombre maximum de tickets par portefeuille.
    uint256 public maxTicketsPerWallet;

    /// @notice Date de fin de la loterie (secondes Unix).
    uint256 public endTime;

    /// @notice Nombre d'adresses différentes ayant acheté au moins un ticket dans la loterie en cours.
    uint256 public participantsCount;

    /// @notice Montant de la cagnotte en cours, en wei.
    /// @dev On n'utilise pas `address(this).balance`, qui contient aussi les gains pas encore récupérés.
    uint256 public currentPot;

    /// @notice Identifiant de la dernière demande de hasard envoyée à Chainlink.
    uint256 public lastRequestId;

    /// @notice Date (secondes Unix) de la dernière demande de hasard envoyée à Chainlink.
    uint256 public drawRequestedAt;

    /// @dev Tickets de chaque loterie : une entrée par ticket (roundId => liste des acheteurs).
    mapping(uint256 => address[]) private _tickets;

    /// @notice Nombre de tickets achetés par joueur et par loterie (roundId => joueur => nombre).
    mapping(uint256 => mapping(address => uint256)) public ticketsOf;

    /// @notice Gains à récupérer avec `withdrawPrize` (si l'envoi automatique a échoué).
    mapping(address => uint256) public pendingWithdrawals;

    /// @notice Historique public des loteries (roundId => résultat).
    mapping(uint256 => RoundResult) public results;

    // =============================================================
    //                          ÉVÉNEMENTS
    // =============================================================

    /// @notice Une nouvelle loterie est ouverte.
    event RoundStarted(uint256 indexed roundId, uint256 ticketPrice, uint256 maxParticipants, uint256 endTime);

    /// @notice Un joueur a acheté des tickets.
    event TicketsPurchased(uint256 indexed roundId, address indexed player, uint256 quantity, uint256 pot);

    /// @notice Le tirage a été demandé à Chainlink VRF.
    event DrawRequested(uint256 indexed roundId, uint256 requestId);

    /// @notice Le gagnant a été tiré au sort.
    event WinnerPicked(uint256 indexed roundId, address indexed winner, uint256 prize);

    /// @notice L'envoi automatique a échoué : les gains sont mis de côté pour le gagnant.
    event PrizeCredited(address indexed winner, uint256 amount);

    /// @notice Le gagnant a récupéré ses gains mis de côté.
    event PrizeWithdrawn(address indexed winner, uint256 amount);

    /// @notice La loterie s'est terminée sans aucun ticket vendu.
    event RoundClosedWithoutWinner(uint256 indexed roundId);

    /// @notice La mairie a arrêté la vente des tickets avant la date prévue.
    event RoundEndedEarly(uint256 indexed roundId, uint256 endTime);

    // =============================================================
    //                    ERREURS PERSONNALISÉES
    // =============================================================

    /// @notice La loterie n'est pas ouverte.
    error LotteryNotOpen();
    /// @notice Une loterie est déjà en cours (ouverte ou en tirage).
    error LotteryNotClosed();
    /// @notice La loterie est terminée (date limite passée ou nombre de participants atteint).
    error LotteryEnded();
    /// @notice La quantité de tickets demandée est invalide (zéro).
    error InvalidQuantity();
    /// @notice Le montant envoyé ne correspond pas au prix exact.
    error IncorrectPayment(uint256 expected, uint256 received);
    /// @notice Le plafond de tickets par portefeuille serait dépassé.
    error TicketLimitReached(uint256 max);
    /// @notice Les conditions de fin de la loterie ne sont pas encore remplies.
    error DrawConditionsNotMet();
    /// @notice Un des paramètres est invalide (zéro).
    error InvalidParameters();
    /// @notice Aucun gain à récupérer.
    error NothingToWithdraw();
    /// @notice L'envoi des ETH a échoué.
    error TransferFailed();
    /// @notice La réponse de Chainlink ne correspond pas à la demande en cours.
    error UnknownRequest();
    /// @notice Seul le coordinateur Chainlink VRF peut fournir le nombre aléatoire.
    error OnlyCoordinatorCanFulfill(address have, address want);
    /// @notice Aucun tirage n'est en attente de réponse de Chainlink.
    error NoPendingDraw();
    /// @notice Le délai avant de pouvoir relancer le tirage n'est pas écoulé.
    error RetryTooEarly(uint256 availableAt);

    // =============================================================
    //                         CONSTRUCTEUR
    // =============================================================

    /**
     * @notice Déploie la loterie. Le compte qui déploie devient la mairie (`owner`).
     * @param _vrfCoordinator Adresse du coordinateur Chainlink VRF v2.5 (ou du mock en local).
     * @param _subscriptionId Identifiant de la souscription Chainlink VRF.
     * @param _keyHash Identifiant de la voie de gas Chainlink.
     */
    constructor(address _vrfCoordinator, uint256 _subscriptionId, bytes32 _keyHash) Ownable(msg.sender) {
        if (_vrfCoordinator == address(0) || _keyHash == bytes32(0)) revert InvalidParameters();
        vrfCoordinator = IVRFCoordinatorV2Plus(_vrfCoordinator);
        subscriptionId = _subscriptionId;
        keyHash = _keyHash;
        state = LotteryState.CLOSED;
    }

    // =============================================================
    //                       FONCTIONS MAIRIE
    // =============================================================

    /**
     * @notice Ouvre une nouvelle loterie. Réservé à la mairie.
     * @dev Aucune boucle : les tickets de la nouvelle loterie sont rangés dans `_tickets[roundId]`,
     *      un tableau neuf. `ticketsOf` est lui aussi indexé par `roundId`.
     * @param newPrice Prix d'un ticket, en wei.
     * @param newMaxParticipants Nombre de participants qui déclenche la fin.
     * @param newMaxTicketsPerWallet Nombre maximum de tickets par portefeuille.
     * @param duration Durée de la loterie, en secondes.
     */
    function startNewRound(
        uint256 newPrice,
        uint256 newMaxParticipants,
        uint256 newMaxTicketsPerWallet,
        uint256 duration
    ) external onlyOwner {
        if (state != LotteryState.CLOSED) revert LotteryNotClosed();
        if (newPrice == 0 || newMaxParticipants == 0 || newMaxTicketsPerWallet == 0 || duration == 0) {
            revert InvalidParameters();
        }

        roundId += 1;
        ticketPrice = newPrice;
        maxParticipants = newMaxParticipants;
        maxTicketsPerWallet = newMaxTicketsPerWallet;
        endTime = block.timestamp + duration;
        participantsCount = 0;
        currentPot = 0;
        state = LotteryState.OPEN;

        emit RoundStarted(roundId, newPrice, newMaxParticipants, endTime);
    }

    /**
     * @notice Arrête la vente des tickets maintenant. Réservé à la mairie.
     * @dev Avance seulement `endTime` à maintenant : le tirage reste ouvert à tous via
     *      `requestDraw()` et le gagnant vient toujours de Chainlink VRF. La mairie ne touche
     *      ni aux tickets, ni à la cagnotte, ni au résultat.
     */
    function endLottery() external onlyOwner {
        if (state != LotteryState.OPEN) revert LotteryNotOpen();
        if (_drawConditionsMet()) revert LotteryEnded();

        endTime = block.timestamp;

        emit RoundEndedEarly(roundId, endTime);
    }

    // =============================================================
    //                     FONCTIONS PARTICIPANTS
    // =============================================================

    /**
     * @notice Achète `quantity` tickets pour la loterie en cours.
     * @dev Chaque ticket ajoute une entrée dans le tirage : les chances sont proportionnelles
     *      au nombre de tickets. La boucle est bornée par `maxTicketsPerWallet`.
     * @param quantity Nombre de tickets à acheter (au moins 1).
     */
    function enterLottery(uint256 quantity) external payable {
        // 1. Vérifications
        if (state != LotteryState.OPEN) revert LotteryNotOpen();
        if (block.timestamp >= endTime || participantsCount >= maxParticipants) revert LotteryEnded();
        if (quantity == 0) revert InvalidQuantity();

        uint256 alreadyOwned = ticketsOf[roundId][msg.sender];
        // Écrit sous cette forme pour éviter tout dépassement de capacité avec une quantité énorme.
        if (quantity > maxTicketsPerWallet - alreadyOwned) revert TicketLimitReached(maxTicketsPerWallet);

        uint256 expected = ticketPrice * quantity;
        if (msg.value != expected) revert IncorrectPayment(expected, msg.value);

        // 2. Modifications de l'état (aucun envoi d'ETH dans cette fonction)
        if (alreadyOwned == 0) {
            participantsCount += 1;
        }
        ticketsOf[roundId][msg.sender] = alreadyOwned + quantity;
        currentPot += msg.value;

        address[] storage roundTickets = _tickets[roundId];
        for (uint256 i = 0; i < quantity; ++i) {
            roundTickets.push(msg.sender);
        }

        emit TicketsPurchased(roundId, msg.sender, quantity, currentPot);
    }

    /**
     * @notice Lance le tirage. N'importe qui peut l'appeler une fois la loterie terminée
     *         (nombre de participants atteint ou date limite passée).
     * @dev Si aucun ticket n'a été vendu, la loterie est fermée sans gagnant.
     *      Sinon, l'état passe à CALCULATING (bloque tout achat et tout second tirage)
     *      avant la demande à Chainlink VRF.
     */
    function requestDraw() external {
        if (state != LotteryState.OPEN) revert LotteryNotOpen();
        if (!_drawConditionsMet()) revert DrawConditionsNotMet();

        uint256 ticketsSold = _tickets[roundId].length;
        if (ticketsSold == 0) {
            state = LotteryState.CLOSED;
            results[roundId] = RoundResult({winner: address(0), prize: 0, timestamp: block.timestamp, ticketsSold: 0});
            emit RoundClosedWithoutWinner(roundId);
            return;
        }

        state = LotteryState.CALCULATING;
        _requestRandomness();
    }

    /**
     * @notice Relance le tirage si Chainlink n'a pas répondu après `DRAW_TIMEOUT`.
     *         N'importe qui peut l'appeler : la cagnotte ne peut jamais rester bloquée.
     * @dev Personne n'obtient de pouvoir sur le résultat : le hasard vient toujours de VRF.
     *      L'ancienne demande devient invalide (`lastRequestId` change), donc une réponse tardive
     *      à celle-ci est rejetée par `fulfillRandomWords`.
     */
    function retryDraw() external {
        if (state != LotteryState.CALCULATING) revert NoPendingDraw();
        uint256 availableAt = drawRequestedAt + DRAW_TIMEOUT;
        if (block.timestamp < availableAt) revert RetryTooEarly(availableAt);
        _requestRandomness();
    }

    /**
     * @notice Point d'entrée appelé par le coordinateur Chainlink VRF avec le nombre aléatoire.
     * @dev Seul le coordinateur (adresse immuable) peut l'appeler. Même nom et même signature
     *      que dans `VRFConsumerBaseV2Plus`, ce qui le rend compatible avec le coordinateur et le mock.
     * @param requestId Identifiant de la demande.
     * @param randomWords Nombres aléatoires fournis par Chainlink.
     */
    function rawFulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) external {
        if (msg.sender != address(vrfCoordinator)) {
            revert OnlyCoordinatorCanFulfill(msg.sender, address(vrfCoordinator));
        }
        fulfillRandomWords(requestId, randomWords);
    }

    /**
     * @notice Récupère les gains mis de côté (si l'envoi automatique au gagnant a échoué).
     * @dev Protégé contre la réentrance (`nonReentrant`) et le montant est remis à zéro AVANT l'envoi.
     */
    function withdrawPrize() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        if (amount == 0) revert NothingToWithdraw();

        pendingWithdrawals[msg.sender] = 0;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) revert TransferFailed();

        emit PrizeWithdrawn(msg.sender, amount);
    }

    // =============================================================
    //                       FONCTIONS DE LECTURE
    // =============================================================

    /// @notice Renvoie la liste des tickets de la loterie en cours (une entrée par ticket).
    /// @return La liste des adresses, dans l'ordre d'achat.
    function getTickets() external view returns (address[] memory) {
        return _tickets[roundId];
    }

    /// @notice Renvoie le montant de la cagnotte en cours, en wei.
    /// @return Le montant de la cagnotte.
    function getPot() external view returns (uint256) {
        return currentPot;
    }

    /// @notice Indique si `requestDraw()` peut être appelée maintenant (utilisé par l'interface).
    /// @return `true` si la loterie est ouverte et terminée.
    function canDraw() external view returns (bool) {
        return state == LotteryState.OPEN && _drawConditionsMet();
    }

    /// @notice Temps restant avant la date limite, en secondes (0 si elle est passée).
    /// @return Le nombre de secondes restantes.
    function timeLeft() external view returns (uint256) {
        return block.timestamp >= endTime ? 0 : endTime - block.timestamp;
    }

    // =============================================================
    //                      FONCTIONS INTERNES
    // =============================================================

    /**
     * @notice Désigne le gagnant à partir du nombre aléatoire et le paie.
     * @dev Ordre « checks-effects-interactions » :
     *      1. vérifie que la réponse correspond à la demande en cours ;
     *      2. enregistre le résultat, remet la cagnotte à zéro et ferme la loterie ;
     *      3. tente l'envoi des gains. Si l'envoi échoue, la fonction ne s'arrête PAS en erreur
     *         (Chainlink ne réessaierait pas et la loterie resterait bloquée) : les gains sont
     *         crédités dans `pendingWithdrawals`.
     * @param requestId Identifiant de la demande.
     * @param randomWords Nombres aléatoires fournis par Chainlink.
     */
    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal {
        // 1. Vérifications
        if (requestId != lastRequestId || state != LotteryState.CALCULATING) revert UnknownRequest();

        // 2. Modifications de l'état
        address[] storage roundTickets = _tickets[roundId];
        uint256 ticketsSold = roundTickets.length;
        address winner = roundTickets[randomWords[0] % ticketsSold];
        uint256 prize = currentPot;

        results[roundId] = RoundResult({
            winner: winner,
            prize: prize,
            timestamp: block.timestamp,
            ticketsSold: ticketsSold
        });
        currentPot = 0;
        state = LotteryState.CLOSED;

        emit WinnerPicked(roundId, winner, prize);

        // 3. Interaction : envoi direct, avec gas limité et sans copie des données renvoyées
        if (!_sendValue(winner, prize, PAYOUT_GAS_LIMIT)) {
            pendingWithdrawals[winner] += prize;
            emit PrizeCredited(winner, prize);
        }
    }

    /// @dev Envoie une demande de hasard à Chainlink VRF et l'enregistre comme demande en cours.
    function _requestRandomness() private {
        uint256 requestId = vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: keyHash,
                subId: subscriptionId,
                requestConfirmations: REQUEST_CONFIRMATIONS,
                callbackGasLimit: CALLBACK_GAS_LIMIT,
                numWords: NUM_WORDS,
                // Paiement des tirages en ETH (nativePayment = true) : la souscription est approvisionnée
                // en ETH, plus simple à obtenir que des LINK sur le réseau de test.
                extraArgs: VRFV2PlusClient._argsToBytes(VRFV2PlusClient.ExtraArgsV1({nativePayment: true}))
            })
        );
        lastRequestId = requestId;
        drawRequestedAt = block.timestamp;

        emit DrawRequested(roundId, requestId);
    }

    /// @dev Indique si la loterie en cours est terminée (participants atteints ou date passée).
    function _drawConditionsMet() private view returns (bool) {
        return participantsCount >= maxParticipants || block.timestamp >= endTime;
    }

    /**
     * @dev Envoie `amount` wei à `to` avec au plus `gasLimit` gas, sans copier les données renvoyées
     *      (protège contre un contrat qui renverrait une énorme réponse pour faire échouer le tirage).
     * @param to Destinataire.
     * @param amount Montant en wei.
     * @param gasLimit Gas maximum transmis.
     * @return success `true` si l'envoi a réussi.
     */
    function _sendValue(address to, uint256 amount, uint256 gasLimit) private returns (bool success) {
        assembly ("memory-safe") {
            success := call(gasLimit, to, amount, 0, 0, 0, 0)
        }
    }

    // Aucune fonction `receive()` ni `fallback()` : tout envoi d'ETH hors `enterLottery` est rejeté.
}
