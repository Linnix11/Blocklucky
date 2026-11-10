/**
 * Preuve du tirage, recalculée dans le navigateur à partir des seules données publiques de la blockchain.
 *
 * Chainlink VRF v2.5 publie la graine aléatoire dans l'événement RandomWordsFulfilled du coordinateur, puis
 * en dérive les nombres livrés au contrat : randomWords[i] = keccak256(abi.encode(graine, i)).
 * (Même calcul dans le vrai coordinateur et dans le mock local, voir @chainlink/contracts.)
 * BlockLucky prend ensuite le ticket n° randomWords[0] % nombre de tickets (fulfillRandomWords).
 * On refait exactement ce calcul : si le résultat correspond au gagnant enregistré, le tirage est vérifié.
 */
import { AbiCoder, Contract, Interface, keccak256 } from "ethers";

const COORDINATOR_ABI = [
  "event RandomWordsFulfilled(uint256 indexed requestId, uint256 outputSeed, uint256 indexed subId, uint96 payment, bool nativePayment, bool success, bool onlyPremium)",
];
const LOG_RANGE = 2000; // blocs par requête au départ
const MIN_RANGE = 10; // certains nœuds gratuits limitent eth_getLogs à quelques blocs
const MAX_BLOCKS = 40000; // au plus 40 000 blocs en arrière (plusieurs jours sur Sepolia)
const MAX_REQUESTS = 60;

/** Nombre aléatoire livré au contrat (randomWords[0]) et ticket gagnant correspondant (index à partir de 0). */
export function winningTicket(seed, ticketCount) {
  const word = BigInt(keccak256(AbiCoder.defaultAbiCoder().encode(["uint256", "uint256"], [seed, 0n])));
  return { word, index: Number(word % BigInt(ticketCount)) };
}

/** « N° 004 » : numéro de ticket affiché (position dans la liste du contrat, à partir de 1). */
export function ticketLabel(index, total) {
  return `N° ${String(index + 1).padStart(Math.max(3, String(total).length), "0")}`;
}

/**
 * Dernier événement correspondant au filtre, en remontant les blocs par tranches.
 * Si le nœud refuse une tranche (plage trop grande), elle est divisée par deux et la même plage est relue.
 */
async function findLast(contract, filter, latest, stopAt = 0) {
  const floor = Math.max(stopAt, latest - MAX_BLOCKS);
  let range = LOG_RANGE;
  for (let to = latest, requests = 0; to >= floor && requests < MAX_REQUESTS; requests++) {
    const from = Math.max(floor, to - range + 1);
    let logs;
    try {
      logs = await contract.queryFilter(filter, from, to);
    } catch (error) {
      if (range <= MIN_RANGE) throw error;
      range = Math.max(MIN_RANGE, Math.floor(range / 2));
      continue;
    }
    if (logs.length) return logs[logs.length - 1];
    to = from - 1;
  }
  return null;
}

/**
 * Mémoire du navigateur : une fois retrouvés, la demande et la graine d'un tirage ne changent plus jamais.
 * On les garde pour ne pas relancer la recherche dans les blocs à chaque visite. Sans stockage (navigation
 * privée…), on refait simplement la recherche.
 */
const storageKey = (lottery, roundId) => `blocklucky-proof:${lottery}:${roundId}`;
function readCache(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    return saved ? { requestId: BigInt(saved.requestId), seed: BigInt(saved.seed), fulfillTx: saved.fulfillTx } : null;
  } catch {
    return null;
  }
}
function writeCache(key, { requestId, seed, fulfillTx }) {
  try {
    localStorage.setItem(key, JSON.stringify({ requestId: String(requestId), seed: String(seed), fulfillTx }));
  } catch {
    // stockage indisponible : sans conséquence
  }
}

/**
 * La mémoire est-elle toujours vraie sur cette blockchain ? (Une blockchain locale redémarrée réutilise les mêmes
 * adresses et numéros de loterie.) On relit la transaction de Chainlink : elle doit contenir la même graine.
 */
async function stillValid(cached, provider, coordinator) {
  const receipt = await provider.getTransactionReceipt(cached.fulfillTx);
  if (!receipt) return false;
  const vrf = new Interface(COORDINATOR_ABI);
  return receipt.logs.some((log) => {
    if (log.address.toLowerCase() !== coordinator.toLowerCase()) return false;
    try {
      const parsed = vrf.parseLog(log);
      return parsed?.name === "RandomWordsFulfilled" && parsed.args[0] === cached.requestId && parsed.args[1] === cached.seed;
    } catch {
      return false;
    }
  });
}

/** Demande du tirage et graine livrée par Chainlink, retrouvées dans les événements. */
async function findDraw({ lottery, provider, coordinator, roundId, fromBlock }) {
  const latest = await provider.getBlockNumber();
  const requested = await findLast(lottery, lottery.filters.DrawRequested(roundId), latest, fromBlock);
  if (!requested) return null;
  const requestId = requested.args[1];
  const vrf = new Contract(coordinator, COORDINATOR_ABI, provider);
  const fulfilled = await findLast(vrf, vrf.filters.RandomWordsFulfilled(requestId), latest, requested.blockNumber);
  if (!fulfilled) return null;
  return { requestId, seed: fulfilled.args[1], fulfillTx: fulfilled.transactionHash };
}

/**
 * Preuve du dernier tirage de la loterie en cours (après le tirage, getTickets() renvoie encore ses tickets).
 * Renvoie null si le tirage n'est pas retrouvé (par exemple trop ancien).
 */
export async function fetchDrawProof({ lottery, provider, coordinator, roundId, fromBlock = 0 }) {
  const key = storageKey(await lottery.getAddress(), roundId);
  const cached = readCache(key);
  const draw = cached && (await stillValid(cached, provider, coordinator)) ? cached : await findDraw({ lottery, provider, coordinator, roundId, fromBlock });
  if (!draw) return null;
  const { requestId, seed, fulfillTx } = draw;

  const [tickets, result, currentRound] = await Promise.all([lottery.getTickets(), lottery.results(roundId), lottery.roundId()]);
  if (currentRound !== roundId || tickets.length === 0) return null;

  writeCache(key, draw);
  const { word, index } = winningTicket(seed, tickets.length);
  return {
    roundId,
    requestId,
    seed,
    word,
    index,
    tickets: [...tickets],
    ticketCount: tickets.length,
    computedWinner: tickets[index],
    recordedWinner: result.winner,
    matches: tickets[index].toLowerCase() === result.winner.toLowerCase(),
    fulfillTx,
  };
}
