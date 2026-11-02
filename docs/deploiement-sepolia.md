# Déploiement sur Sepolia : guide pas à pas (phase 4)

> ⚠️ Le déploiement se fait **sur votre machine**, avec **votre** clé privée de test dans `.env`.
> Ne collez jamais cette clé dans un chat, un commit ou une capture d'écran.

Durée estimée : 30 à 45 minutes (dont l'attente des faucets).

## Valeurs Chainlink VRF v2.5 pour Sepolia

Relevées dans la documentation officielle Chainlink le 02/11/2026
([VRF v2.5 Supported Networks › Ethereum Sepolia › Subscription](https://docs.chain.link/vrf/v2-5/supported-networks#ethereum-sepolia-testnet)).
**Vérifiez-les le jour J** : Chainlink peut les changer.

| Élément | Valeur |
|---|---|
| VRF Coordinator | `0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B` |
| Key Hash (voie 500 gwei) | `0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae` |
| Jeton LINK | `0x779877A7B0D9E8603169DdbD7836e478b4624789` |
| Confirmations min. / max. | 3 / 200 (BlockLucky en demande 3) |
| Gas max. du callback | 2 500 000 (BlockLucky en demande 300 000) |
| Prime (paiement en LINK) | 20 % |

Ces valeurs sont déjà dans `scripts/lib/networkConfig.js` et `.env.example`.

---

## Étape 1 : un portefeuille réservé aux tests

1. Dans MetaMask, créez un **nouveau compte** dédié à BlockLucky (jamais votre compte principal).
2. Activez l'affichage des réseaux de test et sélectionnez **Sepolia**.
3. Ce compte sera la **mairie** (`owner`) de la loterie.

## Étape 2 : des ETH et des LINK de test

- ETH : [faucets.chain.link/sepolia](https://faucets.chain.link/sepolia), ou les faucets Alchemy / Google Cloud.
  Prévoyez environ **0,05 ETH** : le déploiement et l'ouverture d'une loterie coûtent bien moins,
  le reste sert aux tests de la démo.
- LINK : [faucets.chain.link/sepolia](https://faucets.chain.link/sepolia).
- Pour voir vos LINK dans MetaMask : « Importer un jeton » → `0x779877A7B0D9E8603169DdbD7836e478b4624789`.

## Étape 3 : les clés d'accès

1. **Alchemy** (ou Infura) : créez une app « Ethereum Sepolia » et copiez l'URL HTTPS → `SEPOLIA_RPC_URL`.
2. **Etherscan** : [etherscan.io/myapikey](https://etherscan.io/myapikey) → `ETHERSCAN_API_KEY`
   (une seule clé suffit pour tous les réseaux, Sepolia compris).
3. **Clé privée** : MetaMask → compte de test → « Détails du compte » → « Afficher la clé privée » → `PRIVATE_KEY`.

```bash
cp .env.example .env
```

Remplissez `.env`, puis vérifiez qu'il est bien ignoré par Git (la commande doit afficher `.env`) :

```bash
git check-ignore .env
```

## Étape 4 : créer la souscription Chainlink VRF

1. Allez sur [vrf.chain.link](https://vrf.chain.link), réseau **Sepolia**, connectez le compte de test.
2. **Create Subscription** → confirmez la transaction.
3. **Add funds** → déposez des **LINK** de test (le contrat paie en LINK). Mettez-en largement,
   par exemple **10 à 25 LINK**.
   - Pourquoi autant ? Un tirage ne coûte que quelques dixièmes de LINK, mais les nœuds Chainlink
     ne répondent que si le solde couvre le **pire cas** (300 000 gas au prix maximal de la voie 500 gwei).
     Si un tirage reste « Pending » sur vrf.chain.link, le site indique le solde minimum à atteindre :
     ajoutez des LINK et le tirage repart tout seul.
4. Copiez l'**ID de la souscription** (un très grand nombre) → `VRF_SUBSCRIPTION_ID` dans `.env`.

## Étape 5 : tests et déploiement

```bash
npx hardhat test
```

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

Le script :
1. vérifie que la souscription existe et affiche son solde ;
2. déploie BlockLucky et attend 5 confirmations ;
3. vérifie le code source sur Etherscan (badge vert « Contract Source Code Verified ») ;
4. écrit l'ABI et l'adresse dans `frontend/src/contracts/` (à commiter pour l'interface en ligne).

Si la vérification Etherscan échoue (Etherscan parfois lent), le script affiche la commande à relancer.

## Étape 6 : ajouter la loterie comme « consumer » ⚠️ obligatoire

Sur [vrf.chain.link](https://vrf.chain.link) → votre souscription → **Add consumer** → collez
l'adresse de BlockLucky affichée par le script. Sans cette étape, `requestDraw()` sera rejeté par Chainlink.

## Étape 7 : ouvrir la loterie de démo

```bash
npx hardhat run scripts/startRound.js --network sepolia
```

Valeurs de la démo : 0,001 ETH le ticket, 5 participants ou 10 minutes, 5 tickets max par portefeuille.

## Critère de fin de phase 4

- [ ] Le contrat est **vérifié** sur [sepolia.etherscan.io](https://sepolia.etherscan.io)
- [ ] Il apparaît comme consumer de la souscription VRF
- [ ] Une loterie est **ouverte** (`state = 1` dans l'onglet « Read Contract » d'Etherscan)

Envoyez-moi ensuite **uniquement l'adresse du contrat** (jamais la clé privée) : je l'ajouterai à la
documentation et je testerai la lecture de l'état depuis l'interface.

## En cas de problème

| Symptôme | Cause probable | Solution |
|---|---|---|
| `HH100: Network sepolia doesn't exist` | `SEPOLIA_RPC_URL` ou `PRIVATE_KEY` vide dans `.env` | Remplir `.env` |
| `insufficient funds` | Pas assez d'ETH de test | Faucet (étape 2) |
| `La souscription … n'existe pas` | Mauvais `VRF_SUBSCRIPTION_ID` | Recopier l'ID depuis vrf.chain.link |
| `requestDraw` rejeté (`InvalidConsumer`) | Étape 6 oubliée | Ajouter le consumer |
| Tirage bloqué en « tirage en cours » | Pas assez de LINK sur la souscription | Ajouter des LINK ; après 1 h, n'importe qui peut aussi appeler `retryDraw()` |
| `Couldn't download compiler` | Réseau filtré (école, entreprise) | Ajouter `SOLC_LOCAL=1` devant la commande |
