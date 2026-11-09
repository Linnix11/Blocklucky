/**
 * Côté blockchain : le serveur déploie une loterie par mairie et l'administre avec sa clé
 * (PRIVATE_KEY), qui doit être propriétaire de la souscription Chainlink VRF.
 */
import { ethers } from "ethers";
import artifact from "./BlockLucky.artifact.json";

const VRF_ABI = ["function addConsumer(uint256 subId, address consumer)"];

// Un seul signataire pour tout le serveur : le NonceManager numérote les transactions à la suite.
let signer;
function wallet() {
  if (!signer) {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || process.env.SEPOLIA_RPC_URL);
    signer = new ethers.NonceManager(new ethers.Wallet(process.env.PRIVATE_KEY, provider));
  }
  return signer;
}

function lottery(address) {
  return new ethers.Contract(address, artifact.abi, wallet());
}

/** Déploie une loterie et l'ajoute comme consumer de la souscription VRF. */
async function deployLottery() {
  const signer = wallet();
  const { VRF_COORDINATOR, VRF_SUBSCRIPTION_ID, VRF_KEY_HASH } = process.env;
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer);
  const contract = await factory.deploy(VRF_COORDINATOR, VRF_SUBSCRIPTION_ID, VRF_KEY_HASH);
  const receipt = await contract.deploymentTransaction().wait();
  const address = await contract.getAddress();
  const vrf = new ethers.Contract(VRF_COORDINATOR, VRF_ABI, signer);
  await (await vrf.addConsumer(VRF_SUBSCRIPTION_ID, address)).wait();
  return { address, blockNumber: receipt.blockNumber };
}

async function startRound(address, { priceEth, maxParticipants, maxTicketsPerWallet, durationMinutes }) {
  const tx = await lottery(address).startNewRound(
    ethers.parseEther(String(priceEth)),
    BigInt(maxParticipants),
    BigInt(maxTicketsPerWallet),
    BigInt(Math.round(Number(durationMinutes) * 60))
  );
  await tx.wait();
  return tx.hash;
}

async function call(address, method) {
  const tx = await lottery(address)[method]();
  await tx.wait();
  return tx.hash;
}

const MESSAGES = {
  LotteryNotOpen: "Aucune loterie ouverte.",
  LotteryNotClosed: "Une loterie est déjà en cours.",
  DrawConditionsNotMet: "La vente n'est pas terminée (participants ou date de fin pas encore atteints).",
  NoPendingDraw: "Aucun tirage en attente.",
  RetryTooEarly: "Trop tôt : la relance est possible 1 h après la demande.",
  InvalidParameters: "Paramètres invalides.",
};
const lotteryInterface = new ethers.Interface(artifact.abi);

/** Message d'erreur lisible : erreur du contrat traduite si possible. */
export function reason(error) {
  const data = error?.data || error?.info?.error?.data;
  let name = error?.revert?.name;
  try {
    name ||= data && lotteryInterface.parseError(data)?.name;
  } catch {
    // donnée non décodable : message brut
  }
  return MESSAGES[name] || name || error?.shortMessage || error?.message || "Erreur inconnue";
}

/** Si une transaction échoue avant l'envoi, le NonceManager doit relire le nonce sur la chaîne. */
const withReset =
  (fn) =>
  async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      signer?.reset();
      throw error;
    }
  };

export const deploy = withReset(deployLottery);
export const openRound = withReset(startRound);
export const send = withReset(call);
