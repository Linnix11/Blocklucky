# Passation du projet BlockLucky

> État au 9 novembre 2026, après les derniers commits (passage à Next.js, comptes MySQL, tirages payés
> en ETH, guide de la plateforme). À lire en premier par toute personne qui reprend le projet. Le
> fonctionnement détaillé de la plateforme est dans `docs/guide-plateforme.md` ; les autres documents
> sont listés en section 11.

## 1. En 30 secondes

BlockLucky est une **loterie des fêtes sur la blockchain** pour les villes (projet pilote : EtherBay).
Les habitants achètent des tickets en ethers de test sur **Sepolia**, un gagnant est tiré au sort par
**Chainlink VRF** et reçoit **100 % de la cagnotte**. Une plateforme web permet à un administrateur de
créer des mairies, à chaque mairie de gérer sa loterie et sa liste d'habitants autorisés.

| Brique | État |
|---|---|
| Contrat `BlockLucky.sol` | ✅ Terminé, 44 tests, 100 % de couverture, Slither sans faille |
| Contrats sur Sepolia | ✅ Contrat EtherBay d'origine vérifié (`0x82bC…1b5c`, paie Chainlink en LINK) ; chaque ville créée depuis l'admin a son propre contrat (paie en ETH) |
| Site Next.js + API + MySQL | ✅ En ligne sur **https://block.axionstudio.fr** (Hostinger) ; se construit sans erreur ; aucun test automatique de l'API |
| Documentation | 🟡 Complète, quelques passages à mettre à jour (section 9, P3) |
| Soutenance | 🟡 Préparée ; démo de secours en une commande (`npm run demo:locale`, MySQL requis) |

## 2. Le besoin

La ville veut une loterie de fin d'année **transparente et digne de confiance**, objectif 10 000
participants. Le jury : Madame la Maire (évènement marquant), le DSI (sécurité, fiabilité, efficacité),
la Responsable évènementiel (parcours simple). Détails : `CLAUDE.md` (cadrage d'origine) et
`docs/Plan_BlockLucky.md`.

Règles : 0,001 ETH le ticket, 5 tickets max par portefeuille, fin à N participants **ou** à une date,
tirage lançable par n'importe qui, 100 % de la cagnotte au gagnant, la mairie n'a aucun pouvoir sur le
résultat ni sur les fonds.

## 3. Architecture actuelle

```
Habitant / Mairie / Admin (navigateur)
        │
        ▼
Site Next.js (src/app, src/views)  ── lecture et achats via MetaMask ──►  Contrat BlockLucky (un par ville)
        │                                                                       ▲        │
        ▼                                                                       │        ▼
API Next.js (src/app/api) ── signe avec PRIVATE_KEY ── déploie, ouvre, tire ────┘   Chainlink VRF v2.5
        │                                                                      (souscription payée en ETH)
        ▼
MySQL (villes, comptes, sessions, listes d'habitants)
```

### Les trois rôles

| Rôle | Comment il se connecte | Ce qu'il peut faire |
|---|---|---|
| **Admin** | `ADMIN_EMAIL` / `ADMIN_PASSWORD` du `.env` (pas en base) | Créer une mairie (le serveur déploie alors son contrat, ou réutilise une adresse fournie), supprimer une mairie |
| **Mairie** | Compte créé par l'admin | Importer la liste des habitants (CSV de mails ou d'adresses 0x), ouvrir une loterie, lancer ou relancer le tirage. **Ces transactions sont signées par le serveur**, pas par la mairie |
| **Habitant** | Mail inscrit par sa mairie (il choisit son mot de passe à la première connexion), ou adresse MetaMask inscrite | Acheter des tickets avec MetaMask, lancer le tirage, récupérer ses gains |

### Base MySQL

Créée automatiquement au premier appel (`src/server/db.js`) : `cities` (nom, slug, adresse du contrat),
`users` (mairies et habitants, mots de passe hachés avec scrypt), `participants` (liste blanche par
ville), `sessions` (jetons de connexion, cookie `sid`).

### Le contrat

Inchangé dans sa logique depuis la phase 3, sauf le paiement de Chainlink : **en ETH**
(`nativePayment: true`) depuis le commit `b9a68e8`. Points clés, justifiés dans `docs/securite.md` :
- n'hérite pas de `VRFConsumerBaseV2Plus` (sa fonction `setCoordinator` aurait permis au propriétaire
  de truquer le tirage) : coordinateur Chainlink `immutable` ;
- propriétaire (`Ownable2Step`) limité à l'ouverture des loteries, aucune fonction de retrait ;
- gains mis de côté si le gagnant ne peut pas recevoir l'argent, `retryDraw()` après 1 h sans réponse
  de Chainlink, tickets rangés par loterie (aucune boucle qui grossit avec le nombre de joueurs).

## 4. Démarrer en local

Prérequis : Node.js 20.19+ (22 conseillé), **MySQL 8** démarré, MetaMask.

```bash
git clone https://github.com/Linnix11/Blocklucky.git && cd Blocklucky && npm install
```

```bash
cp .env.example .env
```

Remplir au minimum `DB_USER`, `DB_PASSWORD`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (voir section 6).

| Commande | Rôle |
|---|---|
| `npm test` | 44 tests du contrat |
| `npm run coverage` | Couverture du contrat |
| `npm run simulate` | Loterie complète en console (blockchain locale, sans site ni MySQL) |
| `npm run node` | Blockchain locale (http://127.0.0.1:8545, chainId 31337) |
| `npm run deploy:local` / `npm run start-round:local` | Déployer et ouvrir une loterie en local |
| `npm run fulfill:local` | En local, faire répondre le faux Chainlink après un tirage |
| `npm run dev` | Site + API sur http://localhost:3000 (MySQL obligatoire) |
| `npm run build` puis `npm start` | Version de production |
| `npm run deploy:sepolia` | Déployer le contrat EtherBay sur Sepolia (`docs/deploiement-sepolia.md`) |

Réseau filtré (école, entreprise) : préfixer les commandes Hardhat par `SOLC_LOCAL=1` si le compilateur
ne se télécharge pas.

**Site en local avec la blockchain locale :** procédure complète dans `docs/guide-plateforme.md`,
section 5 (MySQL, `npm run node`, `npm run deploy:local`, puis le site avec `NEXT_PUBLIC_CHAIN_ID=31337`,
`RPC_URL=http://127.0.0.1:8545` et le compte n°0 de Hardhat comme `PRIVATE_KEY`).

## 5. Ce qui est en ligne

| Élément | Valeur |
|---|---|
| Contrat EtherBay d'origine (Sepolia) | [`0x82bCD7a9716a3fe6f9dAA0ce94C7DcC809221b5c`](https://sepolia.etherscan.io/address/0x82bCD7a9716a3fe6f9dAA0ce94C7DcC809221b5c), bloc 12097240, code vérifié, **paie Chainlink en LINK** (déployé avant le passage à l'ETH) |
| Contrats des villes | Un par ville, déployé par le serveur à la création de la mairie ; adresses dans la table `cities` et sur la page de chaque ville ; paient en ETH |
| Compte déployeur (propriétaire) | `0x8BfcA33275D6281260bAAAa73Ef84A37aAF89A0A` |
| Coordinateur Chainlink VRF v2.5 | `0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B` (doc officielle Chainlink) |
| KeyHash (voie 500 gwei) | `0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae` |
| ID de souscription VRF | `72357401800805686792438996091991745979891908068616142191495078052483023469668` |
| Site | **https://block.axionstudio.fr** (Hostinger, application Node.js Next.js, redéployée à chaque push sur `main`) |
| Base MySQL de production | Hostinger (hPanel) ; identifiants dans les variables d'environnement de l'application |

`src/contracts/addresses.json` contient le contrat d'origine et le contrat local, utilisés par les scripts Hardhat.
**Attention : chaque push sur `main` redéploie le site en production.**

## 6. Variables d'environnement

Toutes dans `.env` (jamais commité, vérifié par `.gitignore`) en local, et dans le panneau Hostinger
en production. 🔒 = secret.

| Variable | Utilisée par | Rôle |
|---|---|---|
| `SEPOLIA_RPC_URL` 🔒 | Hardhat, serveur | Accès à Sepolia (Alchemy ou Infura) |
| `RPC_URL` | Serveur | Facultatif : remplace `SEPOLIA_RPC_URL` côté serveur (ex. `http://127.0.0.1:8545` en local) |
| `PRIVATE_KEY` 🔒 | Hardhat, serveur | Compte qui déploie et administre **toutes** les loteries, et possède la souscription VRF |
| `ETHERSCAN_API_KEY` 🔒 | Hardhat | Vérification du code sur Etherscan |
| `VRF_SUBSCRIPTION_ID`, `VRF_COORDINATOR`, `VRF_KEY_HASH` | Hardhat, serveur | Paramètres Chainlink (section 5) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` 🔒 | Serveur | Compte administrateur |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` 🔒, `DB_NAME` | Serveur | Connexion MySQL |
| `NEXT_PUBLIC_CHAIN_ID` | Site | `11155111` (Sepolia) ou `31337` (local) |
| `NEXT_PUBLIC_SEPOLIA_RPC_URL` | Site | Lecture publique de Sepolia depuis le navigateur ; **visible par tous**, utiliser une clé restreinte au domaine |
| `REPORT_GAS`, `COINMARKETCAP_API_KEY`, `SOLC_LOCAL` | Hardhat | Options |

## 7. Qualité, vérifiée le 9 novembre

| Contrôle | Résultat |
|---|---|
| `npm test` | **44 tests passent** (43 d'origine + paiement en ETH) |
| `npm run coverage` | **100 %** des instructions, branches, fonctions et lignes de `BlockLucky.sol` |
| Slither 0.11.6 | 10 alertes, les mêmes qu'avant, toutes justifiées dans `docs/securite.md` (annexe D) |
| `npm run build` (Next.js) | ✅ Construit sans erreur |
| Site avec MySQL et Sepolia | En ligne (block.axionstudio.fr) ; je n'ai pas pu le tester depuis mon environnement |
| API (connexion, rôles, listes) | ✅ `npm run test:api` : 11 tests (rôles, accès entre villes, CSV, limite d'essais, lien de confirmation par mail, suppression) |
| CI GitHub | ✅ `.github/workflows/ci.yml` : tests du contrat, construction du site et tests de l'API à chaque push |

## 8. Décisions à connaître

| Décision | Pourquoi |
|---|---|
| Hardhat 2.29.1, `@chainlink/contracts` **1.4.0** (pas 1.5.0) | La 1.5.0 ne compile pas avec Hardhat 2 (`docs/phase0-cadrage.md`) |
| Pas d'héritage de `VRFConsumerBaseV2Plus`, coordinateur `immutable` | Empêche le propriétaire de brancher un faux hasard |
| `retryDraw()` après 1 h | La cagnotte ne reste jamais bloquée si Chainlink ne répond pas |
| Tirages payés en **ETH** | Plus simple à obtenir que des LINK sur le réseau de test |
| Un contrat par ville, déployé et administré par le serveur | Les mairies n'ont pas besoin de portefeuille ni de connaissances blockchain |
| Liste blanche d'habitants en base | Réserver chaque loterie aux habitants inscrits par leur mairie |

## 9. Points ouverts, par priorité

### P1 : à traiter avant la soutenance

1. **Réserve Chainlink.** Toutes les villes partagent une souscription payée en ETH : y garder au moins
   **0,3 ETH** (Chainlink réserve le pire cas avant de répondre), sinon les tirages restent « en cours ».
   Le contrat d'origine `0x82bC…1b5c` paie, lui, en **LINK** (environ 35 LINK de réserve) : pour la
   démo, utiliser une ville créée depuis l'admin.
2. ~~La démo de secours est obsolète~~ **Réglé** : `npm run demo:locale` prépare tout (blockchain, base
   `blocklucky_demo`, mairie, habitants, loterie, site). Prérequis : MySQL démarré. À répéter une fois sur
   l'ordinateur de la soutenance.
3. **La liste blanche n'est appliquée que par le site, pas par le contrat.** Choix assumé et **documenté**
   (`docs/securite.md`, question « Seuls les habitants inscrits peuvent-ils jouer ? », et question bonus de
   `docs/soutenance.md`) : un contrôle dans le contrat casserait la connexion par mail. Piste pour de
   l'argent réel : une signature du serveur par achat, vérifiée par le contrat.
4. **Répéter la démo du guide** (section 6 : admin → mairie → import CSV → loterie → achat → tirage)
   en production, et chronométrer la réponse de Chainlink.

### P2 : sécurité de la plateforme web

5. **Une seule clé serveur pour tout.** `PRIVATE_KEY` est propriétaire de toutes les loteries **et**
   de la souscription VRF, et elle est stockée chez l'hébergeur. Si elle fuit : impossible de voler
   les cagnottes (le contrat ne le permet pas), mais l'attaquant peut annuler la souscription
   (récupérer son solde et **bloquer les tirages**), ouvrir des loteries ou céder la propriété des
   contrats. Parades : compte dédié avec peu d'ETH, souscription approvisionnée au fil de l'eau.
6. ~~**Comptes habitants revendicables.**~~ **Réglé si `SMTP_HOST` est renseigné** : lien de confirmation par mail (24 h, usage unique) ; le mot de passe est choisi en ouvrant le lien. Sans SMTP (démo), l'ancien fonctionnement reste. À la première connexion, n'importe qui connaissant un mail
   inscrit peut choisir le mot de passe à la place de l'habitant (pas de vérification par mail).
   Parade : lien de confirmation envoyé par mail.
7. ~~**Connexion**~~ **Réglé** : 5 essais ratés par mail depuis une même IP (seul ce poste est bloqué, pas le vrai titulaire) et 50 par mail au total, par quart d'heure ; sessions expirées purgées, mot de passe admin comparé en temps constant. Ancien constat : pas de limite au nombre d'essais de mot de passe, sessions jamais purgées en base
   (cookie de 30 jours), mot de passe admin comparé en clair depuis le `.env`. Parades : limitation des
   essais, expiration des sessions, mot de passe admin long.
8. ~~Les documents disent que « la mairie » est propriétaire du contrat~~ **Réglé** : `docs/securite.md`
   et `docs/soutenance.md` décrivent maintenant le rôle de la clé du serveur et ce que son vol permettrait.

### P3 : finitions

9. ~~README~~ **Réglé**. Ancien constat : renseigner l'adresse du contrat, le lien Etherscan et l'URL du site
   (https://block.axionstudio.fr ; la ligne « lien Vercel » est obsolète).
10. ~~Références à l'ancien dossier `frontend/`~~ **Réglé**. Ancien constat : références dans `docs/Plan_BlockLucky.md` (ligne 60) et
    `docs/deploiement-sepolia.md` (ligne 86) : remplacer par `src/contracts/`.
11. ~~`CLAUDE.md`~~ **Réglé** (note en tête). Ancien constat : `CLAUDE.md` (cadrage d'origine) décrit encore Vite et `frontend/` : à garder comme historique ou à
    mettre à jour.
12. ~~Ajouter quelques tests de l'API~~ **Réglé** (`npm run test:api`).
13. Recapturer les écrans du README avec la nouvelle interface et Sepolia.

## 10. Prochaines étapes conseillées

1. Approvisionner la souscription Chainlink en ETH (P1.1) et répéter la démo du guide en production (P1.4).
2. Répéter la démo de secours sur l'ordinateur de la soutenance (P1.2, réparée).
3. Liste blanche (P1.3) et rôle du serveur (P2.8) : documentés dans `docs/securite.md` et `docs/soutenance.md`.
4. Finitions P3, puis répétition générale avec `docs/soutenance.md`.

## 11. Où trouver quoi

| Besoin | Document |
|---|---|
| Comprendre le projet | `README.md`, `docs/Plan_BlockLucky.md` |
| Plateforme : rôles, API, Hostinger, démo, dépannage | `docs/guide-plateforme.md` |
| Cadrage d'origine (règles, spécification) | `CLAUDE.md` |
| Sécurité, questions du DSI | `docs/securite.md` |
| Déployer le contrat seul sur Sepolia | `docs/deploiement-sepolia.md` |
| Préparer la soutenance | `docs/soutenance.md` |
| Versions et pièges techniques | `docs/phase0-cadrage.md` |
| Captures et vidéo | `docs/captures/` |

| Code | Emplacement |
|---|---|
| Contrat | `contracts/BlockLucky.sol` |
| Tests du contrat | `test/BlockLucky.test.js`, `contracts/test/` |
| Scripts Hardhat | `scripts/` |
| Pages du site | `src/app/` (routes), `src/views/` (écrans), `src/components/` |
| Logique blockchain du navigateur | `src/hooks/useBlockLucky.js` |
| API et serveur | `src/app/api/`, `src/server/` (`db.js`, `auth.js`, `chain.js`) |
| Adresses et ABI | `src/contracts/`, `src/server/BlockLucky.artifact.json` |

## 12. Accès à transmettre (hors dépôt)

Rien de secret n'est dans le dépôt. À remettre en main propre à la personne qui reprend :
- le contenu du `.env` de production (clé privée du compte `0x8Bfc…9A0A`, accès MySQL, compte admin) ;
- l'accès au compte Hostinger ;
- l'accès à la souscription Chainlink (via le compte propriétaire, sur vrf.chain.link) ;
- les comptes MetaMask de démo et leurs ETH de test ;
- les accès Alchemy (ou Infura) et Etherscan ;
- l'accès en écriture au dépôt GitHub `Linnix11/Blocklucky`.
