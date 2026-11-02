# Phase 0 : cadrage technique et vérifications préalables

> Objectif : lever les incertitudes techniques **avant** d'écrire la moindre ligne du projet,
> conformément à la règle 7 du `CLAUDE.md` (vérifier les versions au lieu de les deviner).
> Vérifications faites le 02/11/2026 dans un projet prototype jetable (hors dépôt).

## 1. Emplacement du projet

Le dépôt contient déjà des exercices sans rapport (`Desktop/`). Le projet BlockLucky vit donc
dans le dossier **`blocklucky/`**, qui correspond à la racine de l'arborescence de la section 8.
`CLAUDE.md` y est placé (Claude Code le lit quand on travaille dans ce dossier).

## 2. Environnement

| Outil | Version constatée |
|---|---|
| Node.js | 22.23.4 |
| npm | 10.9.9 |

## 3. Versions des bibliothèques retenues

Vérifiées sur le registre npm (`npm view <paquet> dist-tags`).

| Paquet | Version retenue | Justification |
|---|---|---|
| `hardhat` | **2.29.1** (tag `hh2`) | Le tag `latest` est Hardhat **3**, incompatible avec le cadrage (Hardhat 2.x). Il faut donc installer `hardhat@^2` explicitement |
| `@nomicfoundation/hardhat-toolbox` | **6.1.2** (tag `hh2`) | La 7.0.0 cible Hardhat 3. La 6.1.2 exige `hardhat ^2.28.0`, `ethers ^6.14`, `solidity-coverage ^0.8.17`, `hardhat-gas-reporter ^2.3` |
| `@openzeppelin/contracts` | **5.6.1** | Dernière stable (`ReentrancyGuard`) |
| `@chainlink/contracts` | **1.4.0** ⚠️ (et non 1.5.0) | Voir section 4 |
| `solc` (compilateur) | **0.8.24** | Compatible avec `pragma ^0.8.24` et avec Chainlink (`VRFConsumerBaseV2Plus` : `^0.8.4`, `VRFCoordinatorV2_5Mock` : `^0.8.19`) |
| `ethers` (interface) | 6.x (6.17.0) | Exigé par le cadrage |

Cible EVM par défaut de Hardhat avec 0.8.24 : `paris`, compatible avec Sepolia.

## 4. Piège détecté : `@chainlink/contracts@1.5.0`

Dans la 1.5.0, `SubscriptionAPI.sol` (importé par `VRFCoordinatorV2_5Mock`) contient :

```solidity
import {EnumerableSet} from "@openzeppelin/contracts@4.9.6/utils/structs/EnumerableSet.sol";
```

Hardhat 2 ne sait pas résoudre ce chemin « versionné » : la compilation échoue avec
`Cannot find module '@openzeppelin/contracts@4.9.6/package.json'`. Le mock étant **obligatoire
pour les tests** (section 5.4), on épingle **`@chainlink/contracts@1.4.0`**, qui utilise une copie
locale d'OpenZeppelin (`vendor/openzeppelin-solidity/v4.7.3`). Résultat vérifié : le mock et
`VRFConsumerBaseV2Plus` compilent avec Hardhat 2.29.1 et solc 0.8.24 (15 fichiers).

Rappel du cadrage : `VRFConsumerBaseV2Plus` hérite déjà de `ConfirmedOwner` → **ne pas** ajouter
`Ownable` d'OpenZeppelin.

## 5. Contrainte de l'environnement cloud (pas sur une machine personnelle)

Le conteneur cloud dans lequel travaille Claude Code bloque `binaries.soliditylang.org`, d'où Hardhat
télécharge normalement le compilateur. Contournement validé dans le prototype : utiliser le paquet npm
officiel `solc@0.8.24` (version JavaScript) via la sous-tâche Hardhat `TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD`.

Décision pour la phase 1 : ce contournement sera **optionnel**, activé seulement par une variable
d'environnement (ex. `SOLC_LOCAL=1`), pour que la configuration reste standard sur vos machines.

## 6. Points reportés aux phases suivantes

- Adresse du coordinateur VRF v2.5 et `keyHash` Sepolia : à relever dans la documentation officielle
  Chainlink en **phase 4** (pas devinés ici).
- Aucun déploiement Sepolia sans votre accord (règle 5).

## 7. Prochaine étape : phase 1 (environnement)

`npm init`, installation des versions ci-dessus, `hardhat.config.js`, `.env.example`, `.gitignore`,
arborescence de la section 8. Critère : `npx hardhat compile` fonctionne avec un contrat vide.
