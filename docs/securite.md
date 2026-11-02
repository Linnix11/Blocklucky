# Sécurité du contrat BlockLucky

> Brouillon rédigé en phases 2 et 3 (section 6 du cadrage, tests, Slither). Il sera complété
> et vulgarisé pour le DSI en phase 6.

## 1. Grille de la section 6

| Exigence | Statut | Où / comment |
|---|---|---|
| Checks-effects-interactions partout | ✅ | `enterLottery` n'envoie aucun ETH ; `fulfillRandomWords` enregistre le résultat, vide la cagnotte et ferme la loterie **avant** l'envoi ; `withdrawPrize` remet le dû à zéro **avant** l'envoi |
| `nonReentrant` sur `withdrawPrize()` | ✅ | `ReentrancyGuard` d'OpenZeppelin 5.6.1 |
| Contrôle des états (pas de double tirage) | ✅ | `requestDraw` exige `OPEN` et passe à `CALCULATING` avant d'appeler VRF ; `retryDraw` exige `CALCULATING` ; achats refusés hors `OPEN` ; `startNewRound` exige `CLOSED` |
| `fulfillRandomWords` n'accepte que la demande en cours | ✅ | `requestId == lastRequestId` **et** `state == CALCULATING`, sinon `UnknownRequest` |
| `onlyOwner` uniquement sur `startNewRound` | ✅ | Seule fonction métier `onlyOwner`. Les fonctions héritées d'`Ownable2Step` (transfert de propriété) ne touchent ni aux fonds ni au tirage |
| Aucune fonction de retrait pour la mairie | ✅ | Les seuls envois d'ETH vont au gagnant (`fulfillRandomWords`, `withdrawPrize`) |
| Pas de `receive()` / `fallback()` | ✅ | Aucun des deux : un envoi direct d'ETH est rejeté (vérifié) |
| Plafond de tickets et prix exact | ✅ | `TicketLimitReached`, `IncorrectPayment(expected, received)` |
| Pas de boucle sur `tickets` dans les fonctions d'écriture | ✅ | Seule boucle : l'ajout des `quantity` tickets, bornée par `maxTicketsPerWallet`. Pas de `delete tickets` (voir 2.2) |
| Solidity ≥ 0.8 | ✅ | `pragma ^0.8.24`, compilé en 0.8.24 |
| Slither | ✅ | Slither 0.11.6 : aucune faille réelle, 10 alertes justifiées en section 4 |

## 2. Écarts volontaires par rapport à la spécification (section 5)

### 2.1 Pas d'héritage de `VRFConsumerBaseV2Plus` (faille trouvée)

Dans `@chainlink/contracts`, `VRFConsumerBaseV2Plus` expose `setCoordinator(address)`, appelable par
le **propriétaire**. Cette fonction n'est pas `virtual` : impossible de la désactiver.
**Scénario d'attaque :** la mairie remplace le coordinateur par un contrat à elle, puis appelle
`rawFulfillRandomWords` avec le « hasard » de son choix → elle **choisit le gagnant**. Cela viole
la règle « la mairie n'a aucun pouvoir sur le résultat ».

**Parade :** BlockLucky implémente lui-même `rawFulfillRandomWords(uint256, uint256[])` (même
signature, donc compatible avec le vrai coordinateur et avec `VRFCoordinatorV2_5Mock`), et
l'adresse du coordinateur est **`immutable`**. La propriété est gérée par `Ownable2Step`
d'OpenZeppelin (transfert en deux étapes, pour éviter une erreur de saisie de la mairie).

### 2.2 Tickets rangés par loterie (`_tickets[roundId]`) au lieu d'un seul tableau

« Remettre à zéro `tickets` » avec `delete` effacerait chaque case une par une : avec
10 000 tickets, cela dépasse la limite de gas d'un bloc et **bloquerait la loterie pour toujours**.
Chaque loterie a donc son propre tableau ; en ouvrir une nouvelle ne coûte rien. `getTickets()`
renvoie toujours les tickets de la loterie en cours.

### 2.3 Fin de la vente dès que le nombre de participants est atteint

`enterLottery` refuse aussi les achats (`LotteryEnded`) quand `participantsCount >= maxParticipants`,
pas seulement après `endTime`. Sinon on pourrait continuer d'acheter après la fin officielle,
tant que personne n'a lancé le tirage.

### 2.4 Envoi des gains avec gas limité

Dans `fulfillRandomWords`, l'envoi au gagnant transmet au plus `PAYOUT_GAS_LIMIT = 50 000` gas
et ne copie pas les données renvoyées (petit bloc `assembly`). Un gagnant malveillant (contrat)
ne peut donc ni consommer tout le gas du tirage, ni le faire échouer avec une réponse géante.
Si l'envoi échoue, les gains sont crédités (`PrizeCredited`) et récupérables avec `withdrawPrize()`.
`CALLBACK_GAS_LIMIT = 300 000` laisse une large marge pour le reste du traitement.

### 2.5 Petits ajouts

- Erreur `OnlyCoordinatorCanFulfill(have, want)` : seul le coordinateur VRF peut fournir le hasard.
- Le constructeur refuse un coordinateur ou un `keyHash` nuls (`InvalidParameters`).
- Une loterie close sans ticket est aussi inscrite dans `results` (gagnant = adresse zéro).

## 3. Relance du tirage (`retryDraw`), ajoutée en phase 3

**Problème :** si Chainlink ne répond jamais (par exemple une souscription VRF sans LINK), la loterie
resterait en `CALCULATING` et la cagnotte serait bloquée pour toujours.

**Solution :** `retryDraw()`, ouverte à **tous**, utilisable seulement en `CALCULATING` et
`DRAW_TIMEOUT = 1 h` après la dernière demande. Elle envoie une nouvelle demande VRF ; l'ancienne
devient invalide (`lastRequestId` change) et une réponse tardive est rejetée (`UnknownRequest`).
La mairie n'y gagne aucun pouvoir : le hasard vient toujours de VRF.

**Limite honnête (à dire au DSI) :** la documentation Chainlink déconseille de redemander du hasard,
car un opérateur VRF malveillant pourrait retenir une réponse défavorable et attendre la relance.
Ce risque est faible (les preuves VRF sont publiques, un opérateur qui ne répond pas est repérable)
et le délai d'1 h le limite ; on l'accepte face au risque, bien plus concret, d'une cagnotte bloquée.

## 4. Analyse Slither (0.11.6, 102 détecteurs)

Commande : `slither . --filter-paths "node_modules|contracts/test"`
(préfixer par `SOLC_LOCAL=1` si `binaries.soliditylang.org` est inaccessible).

| Alerte | Décision | Justification |
|---|---|---|
| `naming-convention` (4) : paramètres `_price`… de `startNewRound` | **Corrigée** | Renommés `newPrice`, `newMaxParticipants`, `newMaxTicketsPerWallet`, `duration` |
| `uninitialized-state` : `_tickets` « jamais initialisé » | Faux positif | C'est un `mapping` de tableaux, rempli par `push` dans `enterLottery` ; un tableau vide au départ est le comportement voulu |
| `reentrancy-benign` / `reentrancy-events` dans `_requestRandomness` | Accepté | `lastRequestId` dépend de la valeur renvoyée par le coordinateur : on ne peut l'écrire qu'après l'appel. Le coordinateur est une adresse `immutable` de confiance (Chainlink), et l'état est déjà `CALCULATING` avant l'appel : une réentrance ne pourrait ni relancer un tirage ni acheter de tickets |
| `timestamp` (5) : comparaisons avec `block.timestamp` | Accepté | Utilisé uniquement pour des échéances (10 min, 1 h, 31/12), jamais pour le hasard. Un validateur ne peut décaler l'horodatage que de quelques secondes : sans effet sur ces échéances |
| `assembly` dans `_sendValue` | Voulu | Envoi des gains sans copier les données renvoyées et avec gas limité : un gagnant malveillant ne peut pas faire échouer le tirage (voir 2.4) |
| `low-level-calls` dans `withdrawPrize` | Voulu | `call` est la méthode recommandée pour envoyer des ETH (`transfer` est limité à 2 300 gas et échoue avec certains portefeuilles). Protégé par `nonReentrant` et remise à zéro avant l'envoi ; échec → `TransferFailed` |

## 5. Tests et couverture

- `npx hardhat test` : **43 tests**, tous au vert (section 7 complète, plus `retryDraw`, l'appel par
  un faux coordinateur, les réponses VRF inconnues, la liste exacte des fonctions d'écriture et
  `Ownable2Step`).
- `npx hardhat coverage` : **100 %** des instructions, branches, fonctions et lignes de `BlockLucky.sol`.
- Contrats de test : `RejectEther.sol` (gagnant qui refuse les ETH) et `ReentrancyAttacker.sol`
  (tentative de double retrait, bloquée par `ReentrancyGuardReentrantCall`).
