# BlockLucky : interface

React + Vite + ethers.js v6. Pensée d'abord pour le mobile.

## En local

Trois terminaux, depuis la racine du projet :

```bash
npx hardhat node
```

```bash
npm run deploy:local && npm run start-round:local
```

```bash
npm run frontend
```

Dans MetaMask, ajoutez le réseau local (RPC `http://127.0.0.1:8545`, chainId `31337`) et importez un compte
de test affiché par `npx hardhat node`. Après « Lancer le tirage », le bouton « Simuler la réponse de
Chainlink » (ou `npm run fulfill:local`) joue le rôle de Chainlink.

## Sur Sepolia

`scripts/deploy.js --network sepolia` écrit l'adresse dans `src/contracts/addresses.json` : l'interface
cible alors Sepolia automatiquement. Variables facultatives : voir `.env.example`.

## Mise en ligne sur Vercel

1. Importez le dépôt sur vercel.com.
2. **Root Directory** : `frontend`. Vercel détecte Vite (build `npm run build`, sortie `dist`).
3. Variables d'environnement : `VITE_CHAIN_ID=11155111` et, conseillé, `VITE_SEPOLIA_RPC_URL`
   (URL Alchemy avec une clé restreinte au domaine du site).
