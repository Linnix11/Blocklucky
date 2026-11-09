/**
 * Écrit l'ABI et les adresses des contrats dans src/contracts/ pour l'interface.
 *   - BlockLucky.json : { abi }
 *   - addresses.json  : { "<chainId>": { BlockLucky, VRFCoordinator, deployedAt, blockNumber } }
 */
const fs = require("fs");
const path = require("path");

const OUT_DIR = path.join(__dirname, "..", "..", "src", "contracts");
const ADDRESSES_FILE = path.join(OUT_DIR, "addresses.json");

/** Lit addresses.json (objet vide s'il n'existe pas encore). */
function readAddresses() {
  if (!fs.existsSync(ADDRESSES_FILE)) return {};
  return JSON.parse(fs.readFileSync(ADDRESSES_FILE, "utf8"));
}

/**
 * Enregistre un déploiement pour un réseau donné, sans toucher aux autres réseaux.
 * @param {object} artifacts - hre.artifacts
 * @param {bigint|number} chainId
 * @param {object} entry - adresses et informations du déploiement
 */
async function exportToFrontend(artifacts, chainId, entry) {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const { abi } = await artifacts.readArtifact("BlockLucky");
  fs.writeFileSync(path.join(OUT_DIR, "BlockLucky.json"), JSON.stringify({ abi }, null, 2) + "\n");

  const addresses = readAddresses();
  addresses[chainId.toString()] = entry;
  fs.writeFileSync(ADDRESSES_FILE, JSON.stringify(addresses, null, 2) + "\n");

  return OUT_DIR;
}

/** Renvoie l'adresse de BlockLucky déployée sur ce réseau (ou lève une erreur claire). */
function getDeployedAddress(chainId) {
  const entry = readAddresses()[chainId.toString()];
  if (!entry || !entry.BlockLucky) {
    throw new Error(
      `Aucun BlockLucky enregistré pour le chainId ${chainId} dans src/contracts/addresses.json. ` +
        "Lancez d'abord scripts/deploy.js sur ce réseau."
    );
  }
  return entry;
}

module.exports = { exportToFrontend, getDeployedAddress };
