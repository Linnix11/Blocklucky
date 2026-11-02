# Sécurité de BlockLucky

> Document destiné au DSI de la ville d'EtherBay. La première partie se lit en 5 minutes, sans
> connaissance de la blockchain. L'annexe technique donne le détail, ligne de code à l'appui.

## L'essentiel en 5 points

1. **Personne ne peut choisir le gagnant, pas même la mairie.** Le hasard est fourni par Chainlink VRF,
   avec une preuve mathématique vérifiée par le contrat. L'adresse de Chainlink est gravée au déploiement
   et ne peut plus être changée.
2. **Personne ne peut partir avec la cagnotte.** Le contrat ne contient aucune fonction de retrait pour
   la mairie ou l'équipe. L'argent ne peut sortir que vers le gagnant.
3. **La cagnotte ne peut pas rester bloquée.** Si le gagnant ne peut pas recevoir l'argent, il lui est
   réservé. Si Chainlink ne répond pas, n'importe qui peut relancer le tirage après 1 h.
4. **Les règles ne changent pas en cours de route.** Prix, plafond et date de fin sont fixés à l'ouverture
   et ne sont plus modifiables jusqu'au tirage.
5. **Tout est vérifié automatiquement.** 43 tests couvrent 100 % du code, dont des attaques simulées, et
   l'outil d'analyse Slither ne relève aucune faille.

## Les questions qu'un DSI se pose

### « La mairie, ou un employé indélicat, peut-elle truquer le tirage ? »

Non. Le compte de la mairie n'a qu'un seul pouvoir : **ouvrir** une loterie et en fixer les règles.
Le gagnant est désigné par un calcul public (`nombre aléatoire modulo nombre de tickets`) à partir d'un
nombre fourni uniquement par Chainlink. Un test automatique vérifie la liste exacte des fonctions du
contrat : aucune ne permet de choisir le gagnant ou de déplacer les fonds.

**Faille évitée :** le composant Chainlink habituellement utilisé (`VRFConsumerBaseV2Plus`) contient une
fonction réservée au propriétaire qui permet de remplacer Chainlink par n'importe quel autre contrat.
Un propriétaire malhonnête aurait pu y brancher un faux « hasard ». Nous ne l'utilisons pas (annexe B.1).

### « Et si la clé de la mairie est volée ? »

Le voleur obtiendrait le seul pouvoir de la mairie : ouvrir de nouvelles loteries, et seulement quand
aucune n'est en cours. Il pourrait aussi transférer ou abandonner la propriété du contrat, ce qui
empêcherait la mairie d'ouvrir les loteries suivantes (il faudrait alors redéployer). Mais il ne pourrait
**ni toucher à la cagnotte, ni influencer un tirage** : la loterie en cours irait à son terme normalement. La propriété se
transfère en deux étapes (`Ownable2Step`) pour éviter de la confier par erreur à une mauvaise adresse.
Recommandation : garder la clé de la mairie sur un portefeuille matériel ou un coffre multi-signatures.

### « Un pirate peut-il vider le contrat ? »

Les attaques classiques sont bloquées et testées :

| Attaque | Protection | Test |
|---|---|---|
| Réentrance (rappeler le retrait pendant qu'on reçoit l'argent pour se servir deux fois) | Verrou `nonReentrant` d'OpenZeppelin et mise à zéro du solde **avant** l'envoi | Un contrat attaquant tente le double retrait : il échoue |
| Payer moins que le prix, ou dépasser le plafond de tickets | Montant exact exigé, plafond vérifié, y compris avec des quantités absurdes | Oui |
| Acheter après la fin, ou pendant le tirage | Contrôle de l'état de la loterie à chaque action | Oui |
| Lancer deux tirages | La loterie passe en « tirage en cours » avant d'appeler Chainlink | Oui |
| Envoyer un faux « hasard » | Seule l'adresse Chainlink fixée au déploiement est acceptée, et seulement pour la demande en cours | Oui |
| Gagnant malveillant qui bloque le paiement | Envoi limité en gas ; en cas d'échec, les gains sont mis de côté et retirables plus tard | Oui |
| Dépassement de capacité des nombres | Solidity 0.8 : toute erreur de calcul annule la transaction | Natif |

### « Que se passe-t-il si quelque chose tombe en panne ? »

| Panne | Conséquence | Parade |
|---|---|---|
| Chainlink ne répond pas (souscription vide, incident) | Tirage en attente | Ajouter des LINK ; sinon n'importe qui relance après 1 h (`retryDraw`) |
| Le gagnant est un contrat qui refuse l'argent | Envoi automatique impossible | Gains réservés, récupérables avec `withdrawPrize()` |
| Personne n'achète de ticket | Pas de gagnant possible | Clôture propre « sans gagnant », la mairie peut rouvrir |
| Le site web est hors ligne | Interface indisponible | Le contrat continue de fonctionner : on peut l'utiliser depuis Etherscan |
| Sepolia est lent le jour J | Démo ralentie | Démo de secours sur une blockchain locale |

### « Ça tient 10 000 participants ? »

Oui. Aucune action ne parcourt la liste des tickets : le coût d'un achat ou d'un tirage est le même avec
5 ou 10 000 joueurs. Nous avons notamment évité d'effacer la liste des tickets entre deux loteries, ce
qui aurait dépassé la capacité d'un bloc et bloqué le contrat (annexe B.2). Coûts mesurés : un achat
coûte entre 97 000 et 193 000 unités de gas et la désignation du gagnant environ 132 000, alors qu'un
bloc Ethereum en accepte plusieurs dizaines de millions.

### « Le hasard de Chainlink est-il vraiment fiable ? »

Chainlink VRF fournit un nombre aléatoire **et** une preuve cryptographique, vérifiée sur la blockchain,
que ce nombre n'a pas été choisi. Nous n'utilisons jamais l'heure du bloc ni les autres valeurs que les
validateurs peuvent influencer. **Limite honnête :** la relance après 1 h donne en théorie à un opérateur
Chainlink malhonnête la possibilité de retenir un résultat qui ne lui plaît pas pour en obtenir un autre.
Ce risque est faible et visible publiquement ; nous l'avons jugé préférable à une cagnotte bloquée
(annexe C).

## Ce que le contrat ne protège pas (et comment y répondre)

| Risque | Réponse |
|---|---|
| Faux site imitant BlockLucky (hameçonnage) | Communiquer une seule adresse officielle ; l'adresse du contrat est affichée sur le site et vérifiable sur Etherscan |
| Phrase secrète MetaMask perdue ou donnée | Tutoriel sur le site : ne jamais la communiquer, la mairie ne la demandera jamais |
| Vie privée | Les adresses des joueurs sont publiques (c'est la contrepartie de la transparence), mais elles ne donnent ni nom ni identité |
| Âge et identité des joueurs | Hors blockchain : à vérifier à l'inscription pour un vrai évènement |
| Argent réel | Hors périmètre : autorisation légale (ANJ) et audit externe obligatoires avant |
| Dépendance à Chainlink | Service de référence du secteur ; relance prévue en cas de panne |

---

# Annexe technique

## A. Grille de la section 6 du cadrage

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
| Pas de boucle sur `tickets` dans les fonctions d'écriture | ✅ | Seule boucle : l'ajout des `quantity` tickets, bornée par `maxTicketsPerWallet`. Pas de `delete tickets` (voir B.2) |
| Solidity ≥ 0.8 | ✅ | `pragma ^0.8.24`, compilé en 0.8.24 |
| Slither | ✅ | Slither 0.11.6 : aucune faille réelle, 10 alertes justifiées en annexe D |

## B. Écarts volontaires par rapport à la spécification

### B.1 Pas d'héritage de `VRFConsumerBaseV2Plus` (faille trouvée)

Dans `@chainlink/contracts`, `VRFConsumerBaseV2Plus` expose `setCoordinator(address)`, appelable par
le **propriétaire**. Cette fonction n'est pas `virtual` : impossible de la désactiver.
**Scénario d'attaque :** la mairie remplace le coordinateur par un contrat à elle, puis appelle
`rawFulfillRandomWords` avec le « hasard » de son choix → elle **choisit le gagnant**. Cela viole
la règle « la mairie n'a aucun pouvoir sur le résultat ».

**Parade :** BlockLucky implémente lui-même `rawFulfillRandomWords(uint256, uint256[])` (même
signature, donc compatible avec le vrai coordinateur et avec `VRFCoordinatorV2_5Mock`), et
l'adresse du coordinateur est **`immutable`**. La propriété est gérée par `Ownable2Step`
d'OpenZeppelin (transfert en deux étapes, pour éviter une erreur de saisie de la mairie).

### B.2 Tickets rangés par loterie (`_tickets[roundId]`) au lieu d'un seul tableau

« Remettre à zéro `tickets` » avec `delete` effacerait chaque case une par une : avec
10 000 tickets, cela dépasse la limite de gas d'un bloc et **bloquerait la loterie pour toujours**.
Chaque loterie a donc son propre tableau ; en ouvrir une nouvelle ne coûte rien. `getTickets()`
renvoie toujours les tickets de la loterie en cours.

### B.3 Fin de la vente dès que le nombre de participants est atteint

`enterLottery` refuse aussi les achats (`LotteryEnded`) quand `participantsCount >= maxParticipants`,
pas seulement après `endTime`. Sinon on pourrait continuer d'acheter après la fin officielle,
tant que personne n'a lancé le tirage.

### B.4 Envoi des gains avec gas limité

Dans `fulfillRandomWords`, l'envoi au gagnant transmet au plus `PAYOUT_GAS_LIMIT = 50 000` gas
et ne copie pas les données renvoyées (petit bloc `assembly`). Un gagnant malveillant (contrat)
ne peut donc ni consommer tout le gas du tirage, ni le faire échouer avec une réponse géante.
Si l'envoi échoue, les gains sont crédités (`PrizeCredited`) et récupérables avec `withdrawPrize()`.
`CALLBACK_GAS_LIMIT = 300 000` laisse une large marge pour le reste du traitement.

### B.5 Petits ajouts

- Erreur `OnlyCoordinatorCanFulfill(have, want)` : seul le coordinateur VRF peut fournir le hasard.
- Le constructeur refuse un coordinateur ou un `keyHash` nuls (`InvalidParameters`).
- Une loterie close sans ticket est aussi inscrite dans `results` (gagnant = adresse zéro).

## C. Relance du tirage (`retryDraw`)

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

## D. Analyse Slither (0.11.6, 102 détecteurs)

Commande : `slither . --filter-paths "node_modules|contracts/test"`
(préfixer par `SOLC_LOCAL=1` si `binaries.soliditylang.org` est inaccessible).

| Alerte | Décision | Justification |
|---|---|---|
| `naming-convention` (4) : paramètres `_price`… de `startNewRound` | **Corrigée** | Renommés `newPrice`, `newMaxParticipants`, `newMaxTicketsPerWallet`, `duration` |
| `uninitialized-state` : `_tickets` « jamais initialisé » | Faux positif | C'est un `mapping` de tableaux, rempli par `push` dans `enterLottery` ; un tableau vide au départ est le comportement voulu |
| `reentrancy-benign` / `reentrancy-events` dans `_requestRandomness` | Accepté | `lastRequestId` dépend de la valeur renvoyée par le coordinateur : on ne peut l'écrire qu'après l'appel. Le coordinateur est une adresse `immutable` de confiance (Chainlink), et l'état est déjà `CALCULATING` avant l'appel : une réentrance ne pourrait ni relancer un tirage ni acheter de tickets |
| `timestamp` (5) : comparaisons avec `block.timestamp` | Accepté | Utilisé uniquement pour des échéances (10 min, 1 h, 31/12), jamais pour le hasard. Un validateur ne peut décaler l'horodatage que de quelques secondes : sans effet sur ces échéances |
| `assembly` dans `_sendValue` | Voulu | Envoi des gains sans copier les données renvoyées et avec gas limité : un gagnant malveillant ne peut pas faire échouer le tirage (voir B.4) |
| `low-level-calls` dans `withdrawPrize` | Voulu | `call` est la méthode recommandée pour envoyer des ETH (`transfer` est limité à 2 300 gas et échoue avec certains portefeuilles). Protégé par `nonReentrant` et remise à zéro avant l'envoi ; échec → `TransferFailed` |

## E. Tests et couverture

- `npx hardhat test` : **43 tests**, tous au vert (section 7 complète, plus `retryDraw`, l'appel par
  un faux coordinateur, les réponses VRF inconnues, la liste exacte des fonctions d'écriture et
  `Ownable2Step`).
- `npx hardhat coverage` : **100 %** des instructions, branches, fonctions et lignes de `BlockLucky.sol`.
- Contrats de test : `RejectEther.sol` (gagnant qui refuse les ETH) et `ReentrancyAttacker.sol`
  (tentative de double retrait, bloquée par `ReentrancyGuardReentrantCall`).
