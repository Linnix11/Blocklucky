#!/usr/bin/env bash
# Démo de secours en UNE commande : blockchain locale + loterie déployée et ouverte + interface.
#   npm run demo:locale        (Ctrl+C pour tout arrêter)
# Fonctionne sans Internet une fois les dépendances installées (polices mises à part).
set -euo pipefail
cd "$(dirname "$0")/.."

LOG=cache/hardhat-node.log
mkdir -p cache

if curl -s -o /dev/null -X POST -H 'content-type: application/json' \
  --data '{"jsonrpc":"2.0","id":1,"method":"eth_chainId"}' http://127.0.0.1:8545; then
  echo "❌ Le port 8545 est déjà utilisé : arrêtez l'autre « hardhat node » puis relancez."
  exit 1
fi

echo "🎄 1/4 Démarrage de la blockchain locale (journal : $LOG)…"
npx hardhat node > "$LOG" 2>&1 &
NODE_PID=$!
FRONT_PID=""
cleanup() {
  echo -e "\nArrêt de la démo…"
  [ -n "$FRONT_PID" ] && kill "$FRONT_PID" 2>/dev/null || true
  kill "$NODE_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

for _ in $(seq 1 60); do
  if curl -s -o /dev/null -X POST -H 'content-type: application/json' \
    --data '{"jsonrpc":"2.0","id":1,"method":"eth_chainId"}' http://127.0.0.1:8545; then break; fi
  sleep 1
done

echo "🎄 2/4 Déploiement de la loterie et du faux Chainlink…"
npx hardhat run scripts/deploy.js --network localhost | grep -E "BlockLucky :|❌" || true

echo "🎄 3/4 Ouverture d'une loterie de démo…"
npx hardhat run scripts/startRound.js --network localhost | grep -E "ouverte|Fin|❌" || true

cat <<INFO

🎄 4/4 Interface : http://localhost:5173
   MetaMask : réseau « Localhost 8545 » (RPC http://127.0.0.1:8545, chainId 31337, symbole ETH).
   Comptes de test à importer (clés privées publiques de Hardhat, sans valeur) :
INFO
grep -A1 -E "^Account #[0-4]:" "$LOG" | grep -E "Account|Private" | sed 's/^/     /' | head -10
cat <<INFO
   Le compte #0 est la mairie. Après « Lancer le tirage », cliquez « Simuler la réponse de Chainlink ».
   Si MetaMask affiche une erreur de « nonce » après un redémarrage : Paramètres > Avancé >
   « Effacer les données d'activité » pour chaque compte importé.

INFO

VITE_CHAIN_ID=31337 npm --prefix frontend run dev &
FRONT_PID=$!
wait "$FRONT_PID"
