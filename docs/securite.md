# Sécurité du contrat BlockLucky

> Brouillon rédigé en phase 2 (vérification de la section 6 du cadrage). Il sera complété
> et vulgarisé pour le DSI en phase 6.

## 1. Grille de la section 6

| Exigence | Statut | Où / comment |
|---|---|---|
| Checks-effects-interactions partout | ✅ | `enterLottery` n'envoie aucun ETH ; `fulfillRandomWords` enregistre le résultat, vide la cagnotte et ferme la loterie **avant** l'envoi ; `withdrawPrize` remet le dû à zéro **avant** l'envoi |
| `nonReentrant` sur `withdrawPrize()` | ✅ | `ReentrancyGuard` d'OpenZeppelin 5.6.1 |
| Contrôle des états (pas de double tirage) | ✅ | `requestDraw` exige `OPEN` et passe à `CALCULATING` avant d'appeler VRF ; achats refusés hors `OPEN` ; `startNewRound` exige `CLOSED` |
| `fulfillRandomWords` n'accepte que la demande en cours | ✅ | `requestId == lastRequestId` **et** `state == CALCULATING`, sinon `UnknownRequest` |
| `onlyOwner` uniquement sur `startNewRound` | ✅ | Seule fonction métier `onlyOwner`. Les fonctions héritées d'`Ownable2Step` (transfert de propriété) ne touchent ni aux fonds ni au tirage |
| Aucune fonction de retrait pour la mairie | ✅ | Les seuls envois d'ETH vont au gagnant (`fulfillRandomWords`, `withdrawPrize`) |
| Pas de `receive()` / `fallback()` | ✅ | Aucun des deux : un envoi direct d'ETH est rejeté (vérifié) |
| Plafond de tickets et prix exact | ✅ | `TicketLimitReached`, `IncorrectPayment(expected, received)` |
| Pas de boucle sur `tickets` dans les fonctions d'écriture | ✅ | Seule boucle : l'ajout des `quantity` tickets, bornée par `maxTicketsPerWallet`. Pas de `delete tickets` (voir 2.2) |
| Solidity ≥ 0.8 | ✅ | `pragma ^0.8.24`, compilé en 0.8.24 |
| Slither | ⏳ | Prévu en phase 3 |

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

## 3. Risque restant connu (à discuter)

Si Chainlink ne répond jamais (par exemple une souscription VRF sans LINK), la loterie reste en
`CALCULATING` et la cagnotte est bloquée. Parade possible, **non implémentée** pour rester dans la
spécification : une fonction `retryDraw()` ouverte à tous, utilisable après un délai (ex. 1 h),
qui relance une demande VRF. Personne n'y gagne de pouvoir sur le résultat, puisque le hasard
vient toujours de VRF.
