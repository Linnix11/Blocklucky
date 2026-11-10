# Guide de la plateforme BlockLucky

Ce guide décrit la plateforme multi-villes : comptes admin, mairie et habitants, mise en ligne sur Hostinger,
déroulé d'une démo et dépannage. Le contrat lui-même est décrit dans le [README](../README.md) et le
[dossier sécurité](securite.md).

Site en ligne : **https://block.axionstudio.fr**

---

## 1. Ce que fait la plateforme

| Rôle | Où | Ce qu'il fait | MetaMask ? |
|---|---|---|---|
| **Admin** | `/admin` | Crée et supprime les mairies. Chaque création déploie une loterie (un contrat) pour la ville. | Non |
| **Mairie** | `/mairie` | Importe la liste des habitants autorisés (CSV), ouvre une loterie, lance ou relance le tirage. | Non : le serveur signe |
| **Habitant** | `/ville/<nom>` | Achète des tickets s'il est inscrit par sa mairie, récupère ses gains. | Oui, pour payer |
| Tout le monde | `/` | Liste des villes et de leurs loteries (consultation libre). | Non |

Connexion unique pour tous : **`/connexion`**.

- **Admin** : identifiants dans les variables `ADMIN_EMAIL` et `ADMIN_PASSWORD` (pas en base).
- **Mairie** : mail et mot de passe choisis par l'admin à la création de la mairie.
- **Habitant** : son mail doit être dans la liste de sa mairie. À la **première connexion**, le mot de passe saisi devient le sien.
  Un habitant peut aussi jouer sans se connecter si son **adresse MetaMask** (0x…) est dans la liste.

> Le contrôle « seuls les inscrits jouent » est fait par le site et le serveur, pas par le contrat :
> le contrat reste ouvert à toute adresse qui l'appelle directement (par exemple via Etherscan).

---

## 2. Architecture

Un seul projet **Next.js 16** à la racine du dépôt (interface + API), plus le projet **Hardhat** pour le contrat.

```
├── contracts/BlockLucky.sol      le contrat (une instance déployée par ville)
├── test/                          44 tests du contrat
├── scripts/                       déploiement et démo en ligne de commande (Hardhat)
├── src/
│   ├── app/                       pages Next.js
│   │   ├── page.jsx               /              liste des villes
│   │   ├── ville/[slug]/          /ville/<nom>   loterie d'une ville
│   │   ├── connexion/             /connexion
│   │   ├── admin/                 /admin
│   │   ├── mairie/                /mairie
│   │   └── api/                   API (voir ci-dessous)
│   ├── server/
│   │   ├── db.js                  MySQL (tables créées au premier démarrage)
│   │   ├── auth.js                sessions (cookie), rôles
│   │   ├── chain.js               déploiement et gestion des loteries avec PRIVATE_KEY
│   │   └── BlockLucky.artifact.json   ABI + bytecode du contrat (à régénérer si le contrat change)
│   ├── views/                     écrans : accueil, ville, connexion, admin, mairie
│   ├── components/                billet, achat, tirage, gagnant, transparence, panneau de gestion…
│   └── hooks/useBlockLucky.js     lecture du contrat, MetaMask, transactions des habitants
└── docs/exemple-habitants.csv     CSV de test
```

### Qui signe quoi

- Le **serveur** utilise la clé `PRIVATE_KEY` (compte de test `0x8BfcA…89A0A`). Il est propriétaire de tous les contrats
  et de la souscription Chainlink. Il déploie les loteries, les ajoute à la souscription, ouvre les loteries et lance les tirages.
- Les **habitants** signent eux-mêmes leurs achats de tickets et leurs retraits de gains avec MetaMask.

### API

| Méthode | Route | Rôle | Effet |
|---|---|---|---|
| POST | `/api/login` | public | Connexion (admin, mairie, habitant) |
| POST | `/api/logout` | public | Déconnexion |
| GET | `/api/me` | public | Compte connecté |
| GET | `/api/cities` | public | Liste des villes |
| GET | `/api/cities/<slug>/access?wallet=0x…` | public | Le visiteur peut-il jouer ? |
| GET / POST | `/api/admin/cities` | admin | Liste / création d'une mairie (déploie son contrat) |
| DELETE | `/api/admin/cities/<id>` | admin | Suppression (le contrat reste sur la blockchain) |
| GET | `/api/mairie` | mairie | Ville et liste des habitants |
| POST | `/api/mairie/participants` | mairie | Import CSV (`{ csv, replace }`) |
| DELETE | `/api/mairie/participants/<identifiant>` | mairie | Retire un habitant |
| POST | `/api/mairie/round` | mairie | Ouvre une loterie |
| POST | `/api/mairie/draw` | mairie | Lance le tirage |
| POST | `/api/mairie/retry` | mairie | Relance le tirage (1 h sans réponse de Chainlink) |
| POST | `/api/mairie/theme` | mairie | Change le design de la page publique (`{ theme }`) |

### Designs de la page publique

Chaque ville choisit le design de sa page publique parmi cinq : **Sobre** (par défaut), **Fêtes de fin d'année**,
**Littoral**, **Patrimoine** et **Nuit** (sombre). L'admin le choisit à la création de la mairie ; la mairie le change
ensuite dans `/mairie`, section « Apparence de la page publique », avec un aperçu (`/ville/<nom>?design=<id>`) avant
d'enregistrer.

- Catalogue : `src/themes.js` (identifiants, noms, descriptions). Couleurs et polices : `src/themes.css`, qui ne fait
  que redéfinir les variables de `src/tokens.css`. Contrastes vérifiés pour chaque design (texte ≥ 4,5:1).
- Ajouter un design : une entrée dans `src/themes.js` et un bloc `:root[data-theme="<id>"]` dans `src/themes.css`.
- Base : colonne `cities.theme` (`sobre` par défaut), ajoutée automatiquement aux bases existantes au démarrage.
- L'accueil, la connexion et les espaces admin et mairie restent toujours en design Sobre.

### Base de données (MySQL)

Tables créées automatiquement : `cities`, `users` (mairies et habitants, mots de passe hachés avec scrypt),
`participants` (mails ou adresses autorisés par ville), `sessions`.
Pour tout effacer : `TRUNCATE` des quatre tables (le compte admin n'est pas touché).

---

## 3. Chainlink : paiement en ETH

Depuis le 9 novembre 2026, le contrat paie Chainlink VRF en **ETH Sepolia** (`nativePayment: true`), et non plus en LINK.
Les ETH Sepolia se minent sans limite sur [sepolia-faucet.pk910.de](https://sepolia-faucet.pk910.de) ;
les LINK sont limités à 25 par jour.

- Toutes les loteries utilisent la **même souscription** (`VRF_SUBSCRIPTION_ID`, `723574…9668`).
- À approvisionner sur [vrf.chain.link](https://vrf.chain.link) : la souscription → **Actions** → **Fund subscription** → **ETH**.
  Mettez au moins **0,3 ETH**.
- Pourquoi autant ? Chainlink **réserve** le pire cas avant de répondre (300 000 gas à 500 gwei, environ 0,17 ETH),
  puis ne **prélève** que le coût réel (environ 0,01 ETH). Sans réserve suffisante, le tirage reste « en cours ».
- Les contrats déployés avant ce changement (par exemple `0x82bC…1b5c`) paient toujours en **LINK** (environ 35 LINK de réserve).

---

## 4. Mise en ligne sur Hostinger

Application Node.js reliée au dépôt GitHub (déploiement à chaque push sur `main`).

| Réglage | Valeur |
|---|---|
| Framework | **Next.js** |
| Commande de build | `npm run build` |
| Commande de démarrage | `npm start` |
| Version de Node | 22 |

Variables d'environnement (les valeurs ne sont jamais dans le dépôt ; modèle : [`.env.example`](../.env.example)) :

| Variable | Contenu |
|---|---|
| `NEXT_PUBLIC_CHAIN_ID` | `11155111` (Sepolia) |
| `SEPOLIA_RPC_URL` | URL Alchemy ou Infura |
| `PRIVATE_KEY` | clé du compte de test qui déploie et gère les loteries |
| `VRF_COORDINATOR` | `0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B` |
| `VRF_SUBSCRIPTION_ID` | ID de la souscription Chainlink |
| `VRF_KEY_HASH` | `0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | identifiants de l'admin |
| `DB_HOST`, `DB_PORT` | `127.0.0.1`, `3306` |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD` | base MySQL créée dans hPanel |

> `NEXT_PUBLIC_CHAIN_ID` est lue au moment du build : après l'avoir changée, relancez un build.

Le compte de `PRIVATE_KEY` doit avoir des ETH Sepolia (chaque création de ville coûte un déploiement)
et être propriétaire de la souscription Chainlink.

---

## 5. En local

Prérequis : Node 22, MySQL (`brew install mysql && brew services start mysql`, puis `mysql -uroot -e "CREATE DATABASE blocklucky"`).

```bash
npm install
```

**Sur Sepolia** (avec le `.env` rempli) :

```bash
npm run dev
```

**Sur une blockchain locale** (aucun ETH réel nécessaire) :

```bash
npm run node
```

```bash
npm run deploy:local
```

Puis lancez le site avec les valeurs locales : `NEXT_PUBLIC_CHAIN_ID=31337`, `RPC_URL=http://127.0.0.1:8545`,
`PRIVATE_KEY` = compte n°0 de Hardhat, `VRF_COORDINATOR` et `VRF_SUBSCRIPTION_ID` = ceux affichés par
`deploy:local` (aussi dans `src/contracts/addresses.json`). En local, le faux Chainlink ne répond pas tout seul :
`npm run fulfill:local` après chaque tirage.

Site : http://localhost:3000

---

## 6. Faire une démo (5 minutes, une seule personne)

Avant : souscription Chainlink avec au moins 0,3 ETH, et MetaMask sur **Sepolia** avec un peu d'ETH.

1. **Admin** : `/connexion` avec `ADMIN_EMAIL` → `/admin` → **Nouvelle mairie** : nom de la ville, mail et mot de passe
   de la mairie, *Contrat existant* **vide**. Attendre 30 à 60 s (déploiement sur Sepolia).
2. **Mairie** : se déconnecter, se reconnecter avec le mail de la mairie → `/mairie`.
   - Importer [docs/exemple-habitants.csv](exemple-habitants.csv) (il contient l'adresse `0x8BfcA…89A0A`), ou ajouter
     son adresse MetaMask dans le champ « mail ou 0x… ».
   - **Nouvelle loterie** : prix `0.001`, **participants pour clore `1`**, tickets max `5`, **durée `2` minutes**.
3. **Habitant** : `/ville/<nom>` → connecter MetaMask → acheter un ticket → valider dans MetaMask.
   Avec 1 participant, la vente se ferme aussitôt.
4. **Mairie** : `/mairie` → **Lancer le tirage**.
5. Chainlink répond en 1 à 3 minutes : le gagnant s'affiche sur la page de la ville et les gains arrivent dans son portefeuille.

Le tirage est possible dès que **le nombre de participants est atteint OU que la durée est écoulée**.

---

## 7. Dépannage

| Symptôme | Cause | Solution |
|---|---|---|
| 404 sur `/api/login` | L'app Hostinger est en site statique | Framework **Next.js**, démarrage `npm start`, redéployer |
| « Réservé aux habitants inscrits » | Mail ou adresse absent de la liste de la ville | La mairie l'ajoute dans `/mairie` |
| Tirage bloqué « en cours » | Réserve insuffisante sur la souscription | Ajouter des ETH (ou des LINK pour les anciens contrats) ; relance possible après 1 h depuis `/mairie` |
| « La vente n'est pas terminée » au tirage | Ni le nombre de participants ni la date de fin atteints | Attendre la fin, ou ouvrir les loteries avec 1 participant |
| « Une loterie est déjà en cours » | On ne peut ouvrir qu'une loterie à la fois par ville | Tirer la loterie en cours d'abord |
| Création de mairie en erreur | Pas assez d'ETH sur le compte `PRIVATE_KEY`, ou souscription dont il n'est pas propriétaire | Recharger le compte en ETH Sepolia ; vérifier `VRF_SUBSCRIPTION_ID` |
| « Ce mail n'est inscrit par aucune mairie » | Connexion habitant avec un mail non importé | Vérifier le CSV de la mairie |

---

## 8. Historique des changements (9 novembre 2026)

- Contrat déployé et vérifié sur Sepolia, souscription Chainlink créée.
- Espace d'administration, puis plateforme multi-villes : comptes admin / mairie / habitants, import CSV, une loterie par ville.
- Passage à **Next.js** (interface + API dans un seul projet), liens sans `#`.
- Tirages Chainlink payés en **ETH** au lieu de LINK.
