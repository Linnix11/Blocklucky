/**
 * Paramètres Chainlink VRF v2.5 par réseau.
 *
 * Source (règle 7, vérifiée le 02/11/2026) : documentation officielle Chainlink,
 * page « VRF v2.5 Supported Networks », section Ethereum Sepolia Testnet, onglet « Subscription »
 *   https://docs.chain.link/vrf/v2-5/supported-networks#ethereum-sepolia-testnet
 *   (source : github.com/smartcontractkit/documentation, src/content/vrf/v2-5/supported-networks.mdx)
 * Avant le jour J, vérifiez de nouveau ces valeurs : Chainlink peut les modifier.
 * Les variables d'environnement VRF_COORDINATOR et VRF_KEY_HASH, si elles sont remplies, ont la priorité.
 */
const networkConfig = {
  31337: {
    name: "hardhat / localhost",
    local: true,
  },
  11155111: {
    name: "sepolia",
    local: false,
    vrfCoordinator: "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B",
    keyHash: "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae", // voie 500 gwei
    linkToken: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
    minConfirmations: 3, // BlockLucky.REQUEST_CONFIRMATIONS = 3
    maxGasLimit: 2_500_000, // BlockLucky.CALLBACK_GAS_LIMIT = 800 000
    explorer: "https://sepolia.etherscan.io",
    vrfApp: "https://vrf.chain.link/sepolia",
  },
};

/** Valeurs de la démo (section 3 du cadrage). */
const demoRound = {
  ticketPriceEth: "0.001",
  maxParticipants: 5n,
  maxTicketsPerWallet: 5n,
  durationSeconds: 10n * 60n,
};

module.exports = { networkConfig, demoRound };
