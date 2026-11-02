# CLAUDE.md : projet BlockLucky

> Ce fichier sert à la fois de **fiche de cadrage** du projet et d'**instructions pour Claude Code**.
> Place-le **à la racine du dépôt** : Claude Code le lit automatiquement à chaque session.

---

## 0. Instructions pour Claude Code (à lire en premier)

Tu es le développeur principal du projet BlockLucky, un rush de 48 h à Epitech Digital School. Règles de travail :

1. **Travaille phase par phase** (section 9), dans l'ordre. Ne commence une phase que lorsque les critères d'acceptation de la précédente sont validés.
2. **Après chaque modification du contrat, lance `npx hardhat test`.** Si un test échoue, corrige avant de continuer. Ne désactive jamais un test pour le faire passer.
3. **Commente le code en français** (NatSpec `@notice`, `@dev`, `@param`) : le code sera montré au jury.
4. **Sécurité avant tout :** respecte strictement la section 6.
5. **Ne déploie jamais sur Sepolia sans me demander** : il faut ma clé privée et mes ETH de test. Le réseau local Hardhat est libre.
6. **Ne commite jamais `.env`** ni aucune clé privée. Vérifie le `.gitignore` dès la phase 1.
7. **Si une version de bibliothèque ou une adresse (Chainlink, etc.) est incertaine, vérifie-la dans la documentation officielle** au lieu de la deviner.
8. Fais **un commit Git à la fin de chaque phase**, avec un message clair (`feat: phase 2 - smart contract BlockLucky`).
9. À la fin de chaque phase, **résume en 3 lignes** ce qui a été fait et ce qui reste à faire.

---

## 1. Contexte

La **ville d'EtherBay** (120 000 habitants, dont 35 % ont entre 18 et 35 ans) veut faire **sa loterie des fêtes de fin d'année sur la blockchain**, pour que le tirage soit transparent et digne de confiance. Objectif : **10 000 participants**.

Ce que la ville attend du projet :
- **Éducatif :** faire découvrir la blockchain aux habitants
- **Engagement :** au moins 10 000 participants
- **Innovation :** donner à EtherBay l'image d'une ville innovante
- **Transparence :** une confiance totale dans le tirage
- **Collaboration :** renforcer le partenariat entre la mairie et Epitech

Le jury joue trois rôles :
| Juré | Ce qui l'intéresse |
|---|---|
| **Madame la Maire** | Un évènement marquant, inclusif, dont on parle |
| **Le DSI** | Sécurité, fiabilité, efficacité |
| **La Responsable évènementiel** | Facilité d'utilisation, parcours fluide |

**Le projet gagnant :** (1) un smart contract **solide et sécurisé**, (2) qui **convainc** les trois jurés.

---

## 2. Le besoin reformulé

> Les participants **achètent des tickets** en ethers fictifs (réseau de test Sepolia). Quand **un nombre de participants est atteint ou qu'une date limite est passée**, un **gagnant est tiré au hasard de façon vérifiable** et reçoit **toute la cagnotte**. Tout est public et vérifiable sur la blockchain.

---

## 3. Les règles de la loterie

| Paramètre | Valeur |
|---|---|
| Réseau | Hardhat en local (chainId `31337`) et **Sepolia** (chainId `11155111`) |
| Prix du ticket | **0,001 ETH**, réglable à chaque nouvelle loterie |
| Tickets max par portefeuille | **5**, réglable |
| Fin de la loterie | `participantsCount >= maxParticipants` **OU** `block.timestamp >= endTime` |
| Valeurs pour la démo | 5 participants ou 10 minutes |
| Valeurs pour le vrai évènement | 10 000 participants ou le 31/12 |
| Gains | **100 % de la cagnotte** au gagnant |
| Qui déclenche le tirage | **N'importe qui**, une fois la condition de fin remplie |
| Rôle de la mairie (`owner`) | Ouvrir une loterie et régler ses paramètres, **sans aucun pouvoir sur le résultat** |
| Hasard | **Chainlink VRF v2.5**. Plan B en section 5.4 |
| Personne n'a joué | Clôture sans gagnant |
| Chances de gagner | **Proportionnelles au nombre de tickets** (1 ticket = 1 entrée dans le tirage) |

> **Participant** = une adresse de portefeuille différente. **Ticket** = une entrée dans le tirage. Une même adresse peut avoir de 1 à `maxTicketsPerWallet` tickets.

---

## 4. Les outils

| Brique | Outil |
|---|---|
| Langage du contrat | Solidity `^0.8.24` (vérifier la compatibilité avec `@chainlink/contracts`) |
| Framework | **Hardhat 2.x** avec `@nomicfoundation/hardhat-toolbox`, compatible avec `solidity-coverage` et la majorité des tutoriels |
| Bibliothèques | `@openzeppelin/contracts` (`ReentrancyGuard`) et `@chainlink/contracts` (VRF v2.5) |
| Tests | Mocha / Chai (inclus dans la toolbox) et `solidity-coverage` |
| Interface | **React + Vite**, **ethers.js v6** |
| Portefeuille | MetaMask (ou Rabby), sur un compte réservé aux tests |
| Accès au réseau | Alchemy ou Infura |
| Mise en ligne de l'interface | Vercel ou Netlify |

> ⚠️ `VRFConsumerBaseV2Plus` contient **déjà** une gestion de propriétaire (`owner()`, `onlyOwner` via `ConfirmedOwner`). **N'hérite pas en plus d'`Ownable` d'OpenZeppelin**, cela créerait un conflit.

---

## 5. Spécification du smart contract `BlockLucky.sol`

> **Décisions de la phase 2 (ne pas revenir dessus sans raison) :** le contrat n'hérite **pas** de
> `VRFConsumerBaseV2Plus` (son `setCoordinator` laisserait la mairie choisir le gagnant) mais
> implémente `rawFulfillRandomWords` avec un coordinateur `immutable` et `Ownable2Step`.
> Les tickets sont rangés par loterie (`_tickets[roundId]`) pour éviter un `delete` en boucle.
> Détails et justifications : `docs/securite.md`. Versions épinglées : `docs/phase0-cadrage.md`.

### 5.1 État du contrat

```solidity
enum LotteryState { CLOSED, OPEN, CALCULATING }

LotteryState public state;          // CLOSED au déploiement
uint256 public roundId;             // numéro de la loterie, +1 à chaque ouverture
uint256 public ticketPrice;
uint256 public maxParticipants;
uint256 public maxTicketsPerWallet;
uint256 public endTime;
uint256 public participantsCount;   // nombre d'adresses différentes dans cette loterie
address[] private tickets;          // une entrée par ticket
mapping(uint256 => mapping(address => uint256)) public ticketsOf; // roundId => joueur => nombre de tickets
mapping(address => uint256) public pendingWithdrawals;            // gains à récupérer (si l'envoi automatique a échoué)

struct RoundResult { address winner; uint256 prize; uint256 timestamp; uint256 ticketsSold; }
mapping(uint256 => RoundResult) public results;  // historique public des loteries

// Chainlink VRF
uint256 public lastRequestId;
// + paramètres VRF stockés à la construction : subscriptionId, keyHash, callbackGasLimit, requestConfirmations
```

### 5.2 Fonctions

| Fonction | Qui | Ce qu'elle fait |
|---|---|---|
| `constructor(vrfCoordinator, subscriptionId, keyHash)` | Déploiement | Initialise VRF. `state = CLOSED` |
| `startNewRound(price, maxParticipants, maxTicketsPerWallet, duration)` | `onlyOwner` | Exige `state == CLOSED` et des paramètres > 0. Remet à zéro `tickets` et `participantsCount`, incrémente `roundId`, `endTime = now + duration`, `state = OPEN`. Émet `RoundStarted` |
| `enterLottery(uint256 quantity)` `payable` | Tout le monde | Exige `state == OPEN`, `block.timestamp < endTime`, `quantity >= 1`, `msg.value == ticketPrice * quantity` et `ticketsOf + quantity <= maxTicketsPerWallet`. Si c'est le premier ticket de l'adresse, `participantsCount++`. Ajoute `quantity` entrées dans `tickets`. Émet `TicketsPurchased` |
| `requestDraw()` | **Tout le monde** | Exige `state == OPEN` et une condition de fin remplie. Si `tickets.length == 0` : `state = CLOSED`, émet `RoundClosedWithoutWinner`. Sinon : `state = CALCULATING`, demande un nombre aléatoire à VRF et émet `DrawRequested` |
| `fulfillRandomWords(requestId, randomWords)` `internal override` | Coordinateur VRF uniquement | Vérifie `requestId == lastRequestId`. `winner = tickets[randomWords[0] % tickets.length]`. Enregistre `results[roundId]`, `state = CLOSED`, **puis** paie (voir 5.3). Émet `WinnerPicked` |
| `withdrawPrize()` | Le gagnant | `nonReentrant`. Remet le montant dû à zéro **avant** l'envoi. Émet `PrizeWithdrawn` |
| `getTickets()` | Lecture | Renvoie la liste des tickets de la loterie en cours |
| `getPot()` | Lecture | Renvoie le montant de la cagnotte en cours |
| `canDraw()` | Lecture | Indique si `requestDraw()` peut être appelée (utilisé par l'interface) |
| `timeLeft()` | Lecture | Renvoie `endTime - now`, ou 0 |

> **Cagnotte :** utiliser une variable `currentPot` mise à jour à chaque achat, **et non `address(this).balance`**. Le solde total contient aussi les gains pas encore récupérés.

### 5.3 Paiement du gagnant

**Problème :** si l'envoi des ETH échoue dans `fulfillRandomWords` (par exemple si le gagnant est un contrat qui refuse les ETH) et que la fonction s'arrête en erreur, **VRF ne réessaie pas** et la loterie reste bloquée.

**Solution :** dans `fulfillRandomWords`, tous les changements d'état sont faits **avant** l'envoi. On tente ensuite un envoi direct avec `call{value: prize}("")`. **Si l'envoi échoue, on ne stoppe pas la fonction** : on ajoute `prize` à `pendingWithdrawals[winner]` et on émet `PrizeCredited`. Le gagnant récupère alors ses gains avec `withdrawPrize()`.

### 5.4 Plan B si VRF n'est pas faisable à temps

- **En local :** utiliser `VRFCoordinatorV2_5Mock` (fourni par `@chainlink/contracts`). C'est **obligatoire pour les tests** dans tous les cas.
- **Sur Sepolia sans VRF :** système d'engagement en deux temps. Au `startNewRound`, la mairie publie `keccak256(secret)`. Au tirage, elle révèle `secret`, que l'on combine avec `blockhash(block.number - 1)`. **Limite à expliquer au jury :** la mairie pourrait refuser de révéler son secret. C'est pour cela que VRF est la cible.
- **Ne jamais utiliser `block.timestamp` ou `block.prevrandao` seuls** pour le hasard.

### 5.5 Événements

```solidity
event RoundStarted(uint256 indexed roundId, uint256 ticketPrice, uint256 maxParticipants, uint256 endTime);
event TicketsPurchased(uint256 indexed roundId, address indexed player, uint256 quantity, uint256 pot);
event DrawRequested(uint256 indexed roundId, uint256 requestId);
event WinnerPicked(uint256 indexed roundId, address indexed winner, uint256 prize);
event PrizeCredited(address indexed winner, uint256 amount);
event PrizeWithdrawn(address indexed winner, uint256 amount);
event RoundClosedWithoutWinner(uint256 indexed roundId);
```

### 5.6 Erreurs personnalisées (moins coûteuses en gas que les messages `require`)

```solidity
error LotteryNotOpen();
error LotteryNotClosed();
error LotteryEnded();
error InvalidQuantity();
error IncorrectPayment(uint256 expected, uint256 received);
error TicketLimitReached(uint256 max);
error DrawConditionsNotMet();
error InvalidParameters();
error NothingToWithdraw();
error TransferFailed();
error UnknownRequest();
```

---

## 6. Exigences de sécurité (obligatoires)

- [ ] **Checks-effects-interactions** partout : vérifier, puis modifier l'état, puis seulement envoyer l'argent
- [ ] `nonReentrant` sur `withdrawPrize()`
- [ ] Contrôle des états (`OPEN`, `CALCULATING`, `CLOSED`) pour empêcher les appels au mauvais moment, notamment un double tirage
- [ ] `fulfillRandomWords` n'accepte que la demande en cours (`requestId == lastRequestId`)
- [ ] `onlyOwner` **uniquement** sur `startNewRound`. La mairie ne peut **ni** choisir le gagnant, **ni** retirer la cagnotte
- [ ] **Aucune fonction** qui permette à la mairie de retirer des fonds
- [ ] Pas de `receive()` ni de `fallback()` qui accepte des ETH envoyés hors achat de ticket. Si on en ajoute un, il doit rejeter les ETH
- [ ] Le contrat respecte le plafond de tickets et le prix exact
- [ ] Pas de boucle sur `tickets` dans les fonctions qui modifient l'état (risque de manquer de gas avec 10 000 participants), sauf pour ajouter les `quantity` entrées
- [ ] Solidity ≥ 0.8, qui bloque nativement les dépassements de capacité des entiers
- [ ] Lancer **Slither** si possible (`pip install slither-analyzer` puis `slither .`) et traiter ou justifier chaque alerte

---

## 7. Tests à écrire (`test/BlockLucky.test.js`)

Utiliser `VRFCoordinatorV2_5Mock`, `loadFixture` et `time.increase` de `@nomicfoundation/hardhat-network-helpers`.

**Déploiement et ouverture**
- [ ] L'état vaut `CLOSED` après le déploiement, et `owner` est le compte qui a déployé
- [ ] `startNewRound` par la mairie : état `OPEN`, paramètres bien enregistrés, événement émis
- [ ] `startNewRound` par quelqu'un d'autre est refusé
- [ ] `startNewRound` alors qu'une loterie est déjà `OPEN` est refusé
- [ ] `startNewRound` avec un paramètre à 0 est refusé

**Achat de tickets**
- [ ] Achat d'1 ticket au bon prix : ticket ajouté, `participantsCount` = 1, cagnotte mise à jour, événement émis
- [ ] Achat de 3 tickets : 3 entrées dans le tirage, `participantsCount` toujours 1
- [ ] Mauvais montant envoyé : refusé avec `IncorrectPayment`
- [ ] Quantité 0 : refusée
- [ ] Dépassement de `maxTicketsPerWallet` (en un ou plusieurs achats) : refusé
- [ ] Achat après `endTime` : refusé
- [ ] Achat quand la loterie n'est pas `OPEN` : refusé

**Tirage**
- [ ] `requestDraw` avant la fin : refusé avec `DrawConditionsNotMet`
- [ ] `requestDraw` quand `maxParticipants` est atteint : accepté, état `CALCULATING`
- [ ] `requestDraw` après `endTime` : accepté
- [ ] `requestDraw` **par une adresse quelconque** (pas la mairie) : accepté
- [ ] `requestDraw` sans aucun ticket : loterie fermée sans gagnant
- [ ] Achat pendant `CALCULATING` : refusé
- [ ] Double `requestDraw` : refusé

**Gagnant et paiement**
- [ ] Après la réponse du mock VRF, le gagnant fait bien partie des joueurs
- [ ] Le gagnant reçoit **toute** la cagnotte (vérifier les soldes avant et après)
- [ ] `results[roundId]` est bien enregistré et l'état revient à `CLOSED`
- [ ] Si le gagnant est un contrat qui refuse les ETH, les gains sont crédités, puis `withdrawPrize()` fonctionne (créer `contracts/test/RejectEther.sol`)
- [ ] `withdrawPrize()` sans gains dus : refusé
- [ ] Une tentative de réentrance sur `withdrawPrize()` échoue
- [ ] Une nouvelle loterie peut être ouverte après la fin de la précédente, et les compteurs repartent à zéro

**Couverture :** objectif **plus de 90 %** avec `npx hardhat coverage`.

---

## 8. Arborescence du projet

```
blocklucky/
├── CLAUDE.md
├── README.md
├── .env.example            # SEPOLIA_RPC_URL, PRIVATE_KEY, ETHERSCAN_API_KEY, VRF_SUBSCRIPTION_ID, VRF_KEY_HASH, VRF_COORDINATOR
├── .gitignore              # node_modules, .env, cache, artifacts, coverage, frontend/node_modules, frontend/dist
├── hardhat.config.js
├── package.json
├── contracts/
│   ├── BlockLucky.sol
│   └── test/
│       ├── RejectEther.sol
│       └── ReentrancyAttacker.sol
├── scripts/
│   ├── deploy.js           # déploie le contrat et écrit l'adresse et l'ABI dans frontend/src/contracts/
│   ├── startRound.js       # ouvre une loterie avec les valeurs de la démo
│   └── simulate.js         # en local : 5 comptes achètent des tickets, tirage, affichage du gagnant
├── test/
│   └── BlockLucky.test.js
├── frontend/
│   ├── package.json
│   ├── index.html
│   └── src/
│       ├── contracts/      # BlockLucky.json (ABI) et addresses.json (par chainId), générés par deploy.js
│       ├── hooks/useBlockLucky.js
│       ├── components/
│       │   ├── ConnectWallet.jsx
│       │   ├── LotteryStats.jsx    # cagnotte, participants, compte à rebours
│       │   ├── BuyTickets.jsx
│       │   ├── DrawButton.jsx      # visible quand canDraw() renvoie true
│       │   ├── WinnerBanner.jsx
│       │   ├── Transparency.jsx    # liste des tickets, lien Etherscan, historique
│       │   └── HowItWorks.jsx      # « Comment ça marche ? » en 3 étapes et tutoriel MetaMask
│       ├── App.jsx
│       └── main.jsx
└── docs/
    ├── Plan_BlockLucky.md
    └── securite.md          # choix de sécurité expliqués (pour la soutenance)
```

---

## 9. Ce qu'il y a à faire, phase par phase

### Phase 1 : environnement (H3 → H5)
- [ ] `npm init -y`, installer `hardhat@^2`, `@nomicfoundation/hardhat-toolbox`, `@openzeppelin/contracts`, `@chainlink/contracts` et `dotenv`
- [ ] Initialiser Hardhat (projet JavaScript)
- [ ] Configurer `hardhat.config.js` : version de Solidity, optimiseur activé, réseaux `hardhat` et `sepolia` (lus depuis `.env`), clé Etherscan, `gasReporter`
- [ ] Créer `.env.example` et `.gitignore`, puis vérifier que `.env` est bien ignoré
- [ ] Créer l'arborescence de la section 8
- [ ] Premier commit

✅ **Critère :** `npx hardhat compile` fonctionne avec un contrat vide.

### Phase 2 : smart contract (H5 → H16)
- [ ] Écrire `BlockLucky.sol` en suivant exactement la section 5
- [ ] Commenter le code en français (NatSpec)
- [ ] Vérifier chaque point de la section 6

✅ **Critère :** le contrat compile sans avertissement, et toutes les cases de la section 6 sont cochées.

### Phase 3 : tests (H16 → H21)
- [ ] Écrire tous les tests de la section 7
- [ ] Écrire `RejectEther.sol` et `ReentrancyAttacker.sol`
- [ ] Lancer `npx hardhat test` et `npx hardhat coverage`
- [ ] Écrire `scripts/simulate.js` : une loterie complète en local, avec affichage dans la console
- [ ] Lancer Slither si possible

✅ **Critère :** 100 % des tests passent, couverture supérieure à 90 %, `simulate.js` affiche un gagnant.

### Phase 4 : déploiement (H21 → H23) ⚠️ me demander avant
- [ ] Me guider pour créer une souscription Chainlink VRF sur Sepolia (vrf.chain.link) et y déposer des LINK de test
- [ ] Récupérer **dans la documentation officielle de Chainlink** l'adresse du coordinateur VRF v2.5 et le `keyHash` pour Sepolia
- [ ] Écrire `scripts/deploy.js` : déploiement, attente de quelques confirmations, vérification Etherscan, puis export de l'ABI et de l'adresse vers `frontend/src/contracts/`
- [ ] Me rappeler d'ajouter l'adresse du contrat comme *consumer* de la souscription VRF
- [ ] `scripts/startRound.js` avec les valeurs de la démo

✅ **Critère :** le contrat est vérifié sur Sepolia Etherscan, et une loterie est ouverte.

### Phase 5 : interface (H23 → H33)
- [ ] Créer le projet `frontend/` avec Vite (modèle React) et installer `ethers@6`
- [ ] Écrire le hook `useBlockLucky` :
  - connexion du portefeuille via `window.ethereum`
  - détection du réseau, avec un bouton « Passer sur Sepolia » (`wallet_switchEthereumChain`)
  - lecture de l'état du contrat
  - écoute des événements pour mettre à jour l'écran en direct
- [ ] Écrire les composants de la section 8
- [ ] Gérer clairement les cas suivants :
  - pas de portefeuille installé : afficher un lien vers metamask.io
  - mauvais réseau
  - transaction refusée par l'utilisateur
  - solde insuffisant
  - transaction en cours (afficher un indicateur de chargement)
- [ ] Interface **pensée d'abord pour le mobile**, avec des textes en français sans jargon (« portefeuille » plutôt que « wallet », sauf dans le nom des boutons)
- [ ] Ambiance des fêtes : couleurs chaudes, animation et confettis à l'annonce du gagnant
- [ ] Préparer la mise en ligne sur Vercel (`frontend/` comme dossier racine)

✅ **Critère :** depuis le navigateur, en local puis sur Sepolia, on peut se connecter, acheter des tickets, voir les compteurs bouger, déclencher le tirage et voir le gagnant.

### Phase 6 : documentation (H33 → H40)
- [ ] `README.md` :
  - présentation du projet
  - installation
  - commandes : `test`, `coverage`, `simulate`, `deploy`, `frontend`
  - adresse du contrat et lien Etherscan
  - captures d'écran
- [ ] `docs/securite.md` : chaque choix de sécurité expliqué simplement (pour le DSI)
- [ ] *(Le dossier marketing et le cadre légal sont rédigés hors Claude Code)*

### Phase 7 : préparation de la soutenance (H40 → H48)
- [ ] Vérifier que la démo complète marche sur Sepolia
- [ ] Préparer une loterie de démo locale de secours (`npx hardhat node` + `simulate.js` + interface en local)
- [ ] Me lister les 10 questions techniques que le DSI risque de poser, avec des réponses courtes

---

## 10. Commandes utiles

```bash
npx hardhat compile
npx hardhat test
npx hardhat coverage
npx hardhat node                                         # blockchain locale
npx hardhat run scripts/deploy.js --network localhost
npx hardhat run scripts/simulate.js --network localhost
npx hardhat run scripts/deploy.js --network sepolia      # ⚠️ seulement après mon accord
cd frontend && npm run dev
```

---

## 11. Risques et parades

| Risque | Parade |
|---|---|
| Configuration de VRF trop longue | Mock en local dans tous les cas, plan B (section 5.4) sur Sepolia |
| Pas assez d'ETH ou de LINK de test | Plusieurs faucets (Alchemy, Google Cloud, Chainlink) et prix du ticket bas |
| Sepolia lent ou en panne le jour J | Démo en local et vidéo de secours |
| Faille dans le contrat | Section 6, tests, Slither |
| Manque de temps pour l'interface | Version fonctionnelle d'abord, embellissement ensuite |

---

## 12. Hors périmètre (à présenter comme pistes futures)

- Le passage sur le vrai réseau Ethereum avec de l'argent réel (il faudrait une autorisation légale, voir le Code de la sécurité intérieure, art. L322-1 et suivants, et l'ANJ)
- La vérification d'âge et d'identité dans le contrat (pour le vrai évènement, elle se ferait à l'inscription, hors blockchain)
- Une application mobile native
