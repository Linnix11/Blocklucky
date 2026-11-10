#!/usr/bin/env bash
# Démo de secours en UNE commande, sans Sepolia ni Internet (une fois les dépendances installées) :
# blockchain locale + base MySQL de démo + mairie d'EtherBay prête + loterie ouverte + site.
#   npm run demo:locale        (Ctrl+C pour tout arrêter)
#
# Prérequis : MySQL démarré (macOS : brew services start mysql). Par défaut, connexion « root » sans mot de
# passe ; sinon, renseigner DB_USER / DB_PASSWORD dans l'environnement. La base utilisée, « blocklucky_demo »,
# est EFFACÉE et recréée à chaque lancement : elle ne sert qu'à la démo.
set -euo pipefail
cd "$(dirname "$0")/.."

PORT=3000
SITE="http://localhost:$PORT"
RPC="http://127.0.0.1:8545"
LOG=cache/hardhat-node.log
SITE_LOG=cache/demo-site.log
JAR=cache/demo-cookies.txt
mkdir -p cache

# Identifiants de démo (sans valeur, uniquement pour cette démo locale)
export DB_HOST="${DB_HOST:-127.0.0.1}" DB_PORT="${DB_PORT:-3306}" DB_USER="${DB_USER:-root}" DB_PASSWORD="${DB_PASSWORD:-}"
export DB_NAME=blocklucky_demo
export ADMIN_EMAIL=admin@demo.local ADMIN_PASSWORD=demo1234
MAIRIE_EMAIL=mairie@etherbay.demo
MAIRIE_PASSWORD=demo1234
# Compte n° 0 de Hardhat (clé publique de test, sans valeur) : il déploie et administre la loterie
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
export RPC_URL="$RPC" NEXT_PUBLIC_CHAIN_ID=31337

rpc_up() {
  curl -s -o /dev/null -X POST -H 'content-type: application/json' \
    --data '{"jsonrpc":"2.0","id":1,"method":"eth_chainId"}' "$RPC"
}
api() { # api <méthode> <chemin> [json]
  curl -sf -b "$JAR" -c "$JAR" -X "$1" -H 'content-type: application/json' ${3:+-d "$3"} "$SITE/api$2"
}

# --- Vérifications ---
if rpc_up; then
  echo "❌ Le port 8545 est déjà utilisé : arrêtez l'autre « hardhat node » puis relancez."
  exit 1
fi
if curl -s -o /dev/null "$SITE"; then
  echo "❌ Le port $PORT est déjà utilisé : arrêtez l'autre site (npm run dev) puis relancez."
  exit 1
fi
if ! command -v mysql > /dev/null; then
  echo "❌ Commande « mysql » introuvable : installez et démarrez MySQL (macOS : brew install mysql && brew services start mysql)."
  exit 1
fi
MYSQL=(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER")
[ -n "$DB_PASSWORD" ] && MYSQL+=(-p"$DB_PASSWORD")
if ! "${MYSQL[@]}" -e "DROP DATABASE IF EXISTS blocklucky_demo; CREATE DATABASE blocklucky_demo" 2> /dev/null; then
  echo "❌ Connexion à MySQL impossible avec l'utilisateur « $DB_USER ». MySQL est-il démarré ? Sinon : DB_USER=… DB_PASSWORD=… npm run demo:locale"
  exit 1
fi

NODE_PID=""
SITE_PID=""
# deploy.js réécrit addresses.json : on garde l'original (qui peut contenir une adresse Sepolia) pour le remettre à la fin
cp src/contracts/addresses.json cache/addresses.backup.json
cleanup() {
  echo -e "\nArrêt de la démo…"
  [ -n "$SITE_PID" ] && kill "$SITE_PID" 2> /dev/null || true
  [ -n "$NODE_PID" ] && kill "$NODE_PID" 2> /dev/null || true
  cp cache/addresses.backup.json src/contracts/addresses.json 2> /dev/null || true
}
trap cleanup EXIT INT TERM

echo "🎄 1/5 Blockchain locale (journal : $LOG)…"
npx hardhat node > "$LOG" 2>&1 &
NODE_PID=$!
for _ in $(seq 1 60); do rpc_up && break; sleep 1; done

echo "🎄 2/5 Déploiement de la loterie d'EtherBay et du faux Chainlink…"
npx hardhat run scripts/deploy.js --network localhost | grep -E "BlockLucky :|❌" || true
read -r LOTTERY VRF SUB < <(node -e '
  const a = require("./src/contracts/addresses.json")["31337"];
  console.log(a.BlockLucky, a.VRFCoordinator, a.subscriptionId);')
export VRF_COORDINATOR="$VRF" VRF_SUBSCRIPTION_ID="$SUB"
export VRF_KEY_HASH="$(node -e 'console.log(require("ethers").id("blocklucky-local-keyhash"))')"

echo "🎄 3/5 Ouverture d'une loterie de démo…"
npx hardhat run scripts/startRound.js --network localhost | grep -E "ouverte|Fin|❌" || true

echo "🎄 4/5 Démarrage du site (journal : $SITE_LOG)…"
npx next dev -p "$PORT" > "$SITE_LOG" 2>&1 &
SITE_PID=$!
for _ in $(seq 1 90); do curl -s -o /dev/null "$SITE" && break; sleep 1; done

echo "🎄 5/5 Création de la mairie d'EtherBay et inscription des habitants de test…"
rm -f "$JAR"
api POST /login "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" > /dev/null
api POST /admin/cities "{\"name\":\"EtherBay\",\"email\":\"$MAIRIE_EMAIL\",\"password\":\"$MAIRIE_PASSWORD\",\"contractAddress\":\"$LOTTERY\",\"theme\":\"fetes\"}" > /dev/null
rm -f "$JAR"
api POST /login "{\"email\":\"$MAIRIE_EMAIL\",\"password\":\"$MAIRIE_PASSWORD\"}" > /dev/null
HABITANTS=$(grep -oE "^Account #[1-9]: 0x[0-9a-fA-F]{40}" "$LOG" | grep -oE "0x[0-9a-fA-F]{40}" | paste -sd, -)
api POST /mairie/participants "{\"csv\":\"$HABITANTS\"}" > /dev/null
rm -f "$JAR"

cat << INFO

✅ Démo prête : $SITE/ville/etherbay
   Connexion ($SITE/connexion) :
     Admin  : $ADMIN_EMAIL / $ADMIN_PASSWORD
     Mairie : $MAIRIE_EMAIL / $MAIRIE_PASSWORD   (ouvrir une loterie, lancer le tirage)
   MetaMask : réseau « Localhost 8545 » (RPC $RPC, chainId 31337, symbole ETH).
   Habitants inscrits = comptes n° 1 à 9 de Hardhat (clés de test publiques, sans valeur) :
INFO
grep -A1 -E "^Account #[1-5]:" "$LOG" | grep -E "Account|Private" | sed 's/^/     /'
cat << INFO
   Après « Lancer le tirage » (espace mairie), le faux Chainlink ne répond pas tout seul : dans un autre
   terminal, lancez  npm run fulfill:local  et le gagnant s'affiche sur la page de la ville.
   MetaMask affiche une erreur de « nonce » après un redémarrage ? Paramètres > Avancé > « Effacer les
   données d'activité » pour chaque compte importé.

INFO

wait "$SITE_PID"
