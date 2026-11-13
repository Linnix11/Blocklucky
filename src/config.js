/**
 * Configuration de l'interface : réseau ciblé, adresses et ABI du contrat.
 * Les fichiers de src/contracts/ sont générés par scripts/deploy.js.
 */
import addresses from "./contracts/addresses.json";
import lotteryArtifact from "./contracts/BlockLucky.json";

export const NETWORKS = {
  31337: {
    chainId: 31337,
    chainIdHex: "0x7a69",
    name: "Réseau local (Hardhat)",
    shortName: "le réseau local",
    rpcUrl: "http://127.0.0.1:8545",
    explorer: null,
    faucet: null,
  },
  11155111: {
    chainId: 11155111,
    chainIdHex: "0xaa36a7",
    name: "Sepolia (réseau de test Ethereum)",
    shortName: "Sepolia",
    rpcUrl: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
    explorer: "https://sepolia.etherscan.io",
    faucet: "https://faucets.chain.link/sepolia",
  },
};

const requested = Number(process.env.NEXT_PUBLIC_CHAIN_ID);
export const TARGET_CHAIN_ID = NETWORKS[requested] ? requested : addresses["11155111"] ? 11155111 : 31337;
export const TARGET = NETWORKS[TARGET_CHAIN_ID];

/** Déploiement de BlockLucky sur le réseau ciblé (null s'il n'est pas encore déployé). */
export const DEPLOYMENT = addresses[String(TARGET_CHAIN_ID)] || null;

export const LOTTERY_ABI = lotteryArtifact.abi;

/** En local uniquement : le faux coordinateur Chainlink, que n'importe qui peut faire répondre. */
export const MOCK_VRF_ABI = ["function fulfillRandomWords(uint256 requestId, address consumer)"];

/** États du contrat (enum LotteryState). */
export const STATE = { CLOSED: 0, OPEN: 1, CALCULATING: 2 };

/** Valeurs proposées par défaut à la mairie (section 3 du cadrage). */
export const DEMO_ROUND = { priceEur: "2", priceEth: "0.001", maxParticipants: 5, maxTicketsPerWallet: 5, durationMinutes: 10 };
