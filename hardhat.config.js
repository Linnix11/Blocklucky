/**
 * Configuration Hardhat du projet BlockLucky.
 *
 * - Solidity 0.8.24 avec l'optimiseur activé (moins de gas pour les participants).
 * - Réseaux : `hardhat` (local, chainId 31337) et `sepolia` (chainId 11155111, lu depuis .env).
 * - Vérification Etherscan et rapport de gas (`REPORT_GAS=true npx hardhat test`).
 */
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ quiet: true });

const { subtask } = require("hardhat/config");
const { TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD } = require("hardhat/builtin-tasks/task-names");

const SOLC_VERSION = "0.8.24";

const {
  SEPOLIA_RPC_URL = "",
  PRIVATE_KEY = "",
  ETHERSCAN_API_KEY = "",
  REPORT_GAS,
  COINMARKETCAP_API_KEY,
  SOLC_LOCAL,
} = process.env;

/**
 * Option de secours : compilateur fourni par le paquet npm `solc` (version JavaScript).
 * Utile seulement si `binaries.soliditylang.org` est inaccessible (réseau filtré).
 * Activé avec `SOLC_LOCAL=1`. Sans cette variable, Hardhat se comporte normalement.
 */
if (SOLC_LOCAL === "1") {
  subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD, async (args, hre, runSuper) => {
    if (args.solcVersion !== SOLC_VERSION) return runSuper();
    const solc = require("solc");
    return {
      compilerPath: require.resolve("solc/soljson.js"),
      isSolcJs: true,
      version: SOLC_VERSION,
      longVersion: solc.version(),
    };
  });
}

/** Le réseau Sepolia n'est déclaré que si l'URL RPC et la clé privée sont renseignées dans .env. */
const networks = {
  hardhat: { chainId: 31337 },
};
if (SEPOLIA_RPC_URL && PRIVATE_KEY) {
  networks.sepolia = {
    url: SEPOLIA_RPC_URL,
    accounts: [PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY : `0x${PRIVATE_KEY}`],
    chainId: 11155111,
  };
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: SOLC_VERSION,
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks,
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
  sourcify: {
    enabled: false,
  },
  gasReporter: {
    enabled: REPORT_GAS === "true",
    currency: "EUR",
    coinmarketcap: COINMARKETCAP_API_KEY,
  },
  mocha: {
    timeout: 60000,
  },
};
