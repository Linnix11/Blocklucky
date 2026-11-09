/**
 * useBlockLucky : toute la logique blockchain de l'interface.
 *
 * - Lecture : l'état de la loterie est lu via un nœud public (pas besoin de portefeuille pour regarder).
 * - Événements : les événements du contrat sont relevés toutes les quelques secondes
 *   (TicketsPurchased, WinnerPicked…) pour mettre l'écran à jour en direct.
 * - Portefeuille : connexion via window.ethereum (MetaMask, Rabby…), détection du réseau,
 *   bascule vers le bon réseau, envoi des transactions avec suivi de leur état.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrowserProvider, Contract, JsonRpcProvider, Network, parseEther } from "ethers";
import { DEPLOYMENT, LOTTERY_ABI, MOCK_VRF_ABI, STATE, TARGET, TARGET_CHAIN_ID } from "../config";
import { humanizeError, isUserRejection } from "../lib/errors";
import { formatEth, sameAddress } from "../lib/format";

const POLL_INTERVAL_MS = 4000;
const HISTORY_SIZE = 8;
const ACTIVITY_SIZE = 25;
const MAX_LOG_RANGE = 2000; // blocs lus par requête d'événements

const IDLE_TX = { status: "idle", label: "", successText: "", hash: null, error: null };

/** Fournisseur MetaMask (ou autre portefeuille compatible), s'il est installé. */
function getInjectedProvider() {
  return typeof window !== "undefined" ? window.ethereum : undefined;
}

export function useBlockLucky() {
  const ethereum = getInjectedProvider();

  // ---------- Lecture sans portefeuille ----------
  const readProvider = useMemo(
    () => new JsonRpcProvider(TARGET.rpcUrl, Network.from(TARGET_CHAIN_ID), { staticNetwork: true }),
    []
  );
  const readContract = useMemo(
    () => (DEPLOYMENT ? new Contract(DEPLOYMENT.BlockLucky, LOTTERY_ABI, readProvider) : null),
    [readProvider]
  );

  // ---------- État React ----------
  const [account, setAccount] = useState(null);
  const [walletChainId, setWalletChainId] = useState(null);
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [activity, setActivity] = useState([]);
  const [announcement, setAnnouncement] = useState(null);
  const [tx, setTx] = useState(IDLE_TX);

  const accountRef = useRef(null);
  const lastBlockRef = useRef(null);
  const busyRef = useRef(false);
  accountRef.current = account;

  // ---------- Lecture de l'état du contrat ----------
  const fetchSnapshot = useCallback(
    async (player) => {
      const c = readContract;
      const [
        state,
        roundId,
        ticketPrice,
        maxParticipants,
        maxTicketsPerWallet,
        endTime,
        participantsCount,
        pot,
        tickets,
        canDraw,
        owner,
        drawRequestedAt,
        drawTimeout,
        lastRequestId,
        pendingOwner,
        subscriptionId,
      ] = await Promise.all([
        c.state(),
        c.roundId(),
        c.ticketPrice(),
        c.maxParticipants(),
        c.maxTicketsPerWallet(),
        c.endTime(),
        c.participantsCount(),
        c.getPot(),
        c.getTickets(),
        c.canDraw(),
        c.owner(),
        c.drawRequestedAt(),
        c.DRAW_TIMEOUT(),
        c.lastRequestId(),
        c.pendingOwner(),
        c.subscriptionId(),
      ]);

      let me = null;
      if (player) {
        const [myTickets, pendingPrize, balance] = await Promise.all([
          roundId > 0n ? c.ticketsOf(roundId, player) : 0n,
          c.pendingWithdrawals(player),
          readProvider.getBalance(player),
        ]);
        me = { myTickets, pendingPrize, balance };
      }

      const ids = [];
      for (let id = roundId; id >= 1n && ids.length < HISTORY_SIZE; id--) ids.push(id);
      const results = await Promise.all(ids.map((id) => c.results(id)));
      const history = results
        .map((r, i) => ({
          roundId: ids[i],
          winner: r.winner,
          prize: r.prize,
          timestamp: Number(r.timestamp),
          ticketsSold: r.ticketsSold,
        }))
        .filter((r) => r.timestamp > 0);

      return {
        state: Number(state),
        roundId,
        ticketPrice,
        maxParticipants,
        maxTicketsPerWallet,
        endTime: Number(endTime),
        participantsCount,
        pot,
        tickets: [...tickets],
        canDraw,
        owner,
        drawRequestedAt: Number(drawRequestedAt),
        drawTimeout: Number(drawTimeout),
        lastRequestId,
        pendingOwner,
        subscriptionId,
        me,
        history,
      };
    },
    [readContract, readProvider]
  );

  // ---------- Écoute des événements ----------
  const pollEvents = useCallback(async () => {
    const latest = await readProvider.getBlockNumber();
    const firstRun = lastBlockRef.current === null;
    const from = firstRun
      ? Math.max(DEPLOYMENT.blockNumber ?? 0, latest - MAX_LOG_RANGE)
      : lastBlockRef.current + 1;
    if (from > latest) return;
    const to = Math.min(latest, from + MAX_LOG_RANGE);

    const logs = await readContract.queryFilter("*", from, to);
    lastBlockRef.current = to;

    const entries = logs
      .filter((log) => log.eventName)
      .map((log) => ({
        id: `${log.transactionHash}-${log.index}`,
        name: log.eventName,
        args: log.args,
        blockNumber: log.blockNumber,
        txHash: log.transactionHash,
      }));
    if (entries.length === 0) return;

    // Plus récent en premier. Copie inversée calculée hors de la fonction de mise à jour
    // (React peut appeler celle-ci deux fois en mode strict).
    const newestFirst = [...entries].reverse();
    setActivity((previous) => [...newestFirst, ...previous].slice(0, ACTIVITY_SIZE));

    // Annonce du gagnant uniquement pour les tirages vus en direct (pas l'historique au chargement)
    if (!firstRun) {
      const picked = entries.find((e) => e.name === "WinnerPicked");
      if (picked) {
        setAnnouncement({ roundId: picked.args[0], winner: picked.args[1], prize: picked.args[2] });
      }
    }
  }, [readContract, readProvider]);

  const refresh = useCallback(async () => {
    if (!readContract || busyRef.current) return;
    busyRef.current = true;
    try {
      await pollEvents();
      setData(await fetchSnapshot(accountRef.current));
      setLoadError(null);
    } catch (error) {
      console.error(error);
      setLoadError(
        TARGET_CHAIN_ID === 31337
          ? "Impossible de joindre le réseau local. Lancez « npx hardhat node » puis « npm run deploy:local »."
          : "Impossible de lire la loterie sur Sepolia pour le moment. Nouvel essai dans quelques secondes."
      );
    } finally {
      busyRef.current = false;
    }
  }, [readContract, pollEvents, fetchSnapshot]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  // Nouvelle lecture immédiate quand le compte change
  useEffect(() => {
    refresh();
  }, [account, refresh]);

  // ---------- Portefeuille ----------
  useEffect(() => {
    if (!ethereum) return undefined;
    ethereum.request({ method: "eth_accounts" }).then((accounts) => setAccount(accounts[0] ?? null)).catch(() => {});
    ethereum.request({ method: "eth_chainId" }).then((id) => setWalletChainId(Number(id))).catch(() => {});

    const onAccounts = (accounts) => setAccount(accounts[0] ?? null);
    const onChain = (id) => setWalletChainId(Number(id));
    ethereum.on?.("accountsChanged", onAccounts);
    ethereum.on?.("chainChanged", onChain);
    return () => {
      ethereum.removeListener?.("accountsChanged", onAccounts);
      ethereum.removeListener?.("chainChanged", onChain);
    };
  }, [ethereum]);

  const connect = useCallback(async () => {
    if (!ethereum) return;
    try {
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      setAccount(accounts[0] ?? null);
      setWalletChainId(Number(await ethereum.request({ method: "eth_chainId" })));
    } catch (error) {
      setTx({ ...IDLE_TX, status: "error", label: "Connexion", error: humanizeError(error) });
    }
  }, [ethereum]);

  const switchNetwork = useCallback(async () => {
    if (!ethereum) return;
    try {
      await ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: TARGET.chainIdHex }] });
    } catch (error) {
      // 4902 : le portefeuille ne connaît pas encore ce réseau, on le lui ajoute
      if (error?.code === 4902 || error?.data?.originalError?.code === 4902) {
        try {
          await ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: TARGET.chainIdHex,
                chainName: TARGET.name,
                nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
                rpcUrls: [TARGET.rpcUrl],
                blockExplorerUrls: TARGET.explorer ? [TARGET.explorer] : undefined,
              },
            ],
          });
        } catch (addError) {
          setTx({ ...IDLE_TX, status: "error", label: "Changement de réseau", error: humanizeError(addError) });
        }
      } else {
        setTx({ ...IDLE_TX, status: "error", label: "Changement de réseau", error: humanizeError(error) });
      }
    }
  }, [ethereum]);

  const wrongNetwork = Boolean(account && walletChainId !== null && walletChainId !== TARGET_CHAIN_ID);
  const isOwner = Boolean(account && data && sameAddress(account, data.owner));
  const isPendingOwner = Boolean(account && data && sameAddress(account, data.pendingOwner));
  const txInProgress = tx.status === "wallet" || tx.status === "pending";

  /**
   * Envoie une transaction et suit son état : « wallet » (à confirmer), « pending » (envoyée),
   * « success » ou « error ».
   */
  const send = useCallback(
    async ({ label, successText }, buildTx) => {
      if (!ethereum || !account) {
        setTx({ ...IDLE_TX, status: "error", label, error: "Connectez d'abord votre portefeuille." });
        return false;
      }
      if (wrongNetwork) {
        setTx({ ...IDLE_TX, status: "error", label, error: `Passez d'abord votre portefeuille sur ${TARGET.shortName}.` });
        return false;
      }
      setTx({ ...IDLE_TX, status: "wallet", label, successText });
      try {
        const signer = await new BrowserProvider(ethereum).getSigner();
        const response = await buildTx(signer);
        setTx({ ...IDLE_TX, status: "pending", label, successText, hash: response.hash });
        await response.wait();
        setTx({ ...IDLE_TX, status: "success", label, successText, hash: response.hash });
        await refresh();
        return true;
      } catch (error) {
        if (!isUserRejection(error)) console.error(error);
        setTx({ ...IDLE_TX, status: "error", label, error: humanizeError(error) });
        return false;
      }
    },
    [ethereum, account, wrongNetwork, refresh]
  );

  const lotteryWith = (signer) => new Contract(DEPLOYMENT.BlockLucky, LOTTERY_ABI, signer);

  // ---------- Actions ----------
  const buyTickets = useCallback(
    async (quantity) => {
      const q = BigInt(quantity);
      const cost = data.ticketPrice * q;
      if (data.me && data.me.balance < cost) {
        setTx({
          ...IDLE_TX,
          status: "error",
          label: "Achat de tickets",
          error: `Solde insuffisant : il faut ${formatEth(cost)} plus les frais de réseau, vous avez ${formatEth(data.me.balance)}.`,
        });
        return false;
      }
      return send(
        { label: "Achat de tickets", successText: q > 1n ? `${q} tickets achetés. Bonne chance !` : "Ticket acheté. Bonne chance !" },
        (signer) => lotteryWith(signer).enterLottery(q, { value: cost })
      );
    },
    [data, send]
  );

  const requestDraw = useCallback(
    () =>
      send({ label: "Lancement du tirage", successText: "Tirage lancé : Chainlink calcule le résultat." }, (signer) =>
        lotteryWith(signer).requestDraw()
      ),
    [send]
  );

  const retryDraw = useCallback(
    () =>
      send({ label: "Relance du tirage", successText: "Nouvelle demande envoyée à Chainlink." }, (signer) =>
        lotteryWith(signer).retryDraw()
      ),
    [send]
  );

  const withdrawPrize = useCallback(
    () =>
      send({ label: "Récupération des gains", successText: "Gains récupérés dans votre portefeuille." }, (signer) =>
        lotteryWith(signer).withdrawPrize()
      ),
    [send]
  );

  const startNewRound = useCallback(
    ({ priceEth, maxParticipants, maxTicketsPerWallet, durationMinutes }) =>
      send({ label: "Ouverture de la loterie", successText: "Nouvelle loterie ouverte." }, (signer) =>
        lotteryWith(signer).startNewRound(
          parseEther(String(priceEth)),
          BigInt(maxParticipants),
          BigInt(maxTicketsPerWallet),
          BigInt(Math.round(Number(durationMinutes) * 60))
        )
      ),
    [send]
  );

  const transferOwnership = useCallback(
    (newOwner) =>
      send(
        { label: "Transfert de la mairie", successText: "Transfert proposé : le nouveau compte doit l'accepter." },
        (signer) => lotteryWith(signer).transferOwnership(newOwner)
      ),
    [send]
  );

  const acceptOwnership = useCallback(
    () =>
      send({ label: "Acceptation de la mairie", successText: "Vous êtes maintenant la mairie." }, (signer) =>
        lotteryWith(signer).acceptOwnership()
      ),
    [send]
  );

  /** Réseau local uniquement : fait répondre le faux coordinateur Chainlink. */
  const simulateChainlink = useCallback(
    () =>
      send({ label: "Réponse de Chainlink (simulée)", successText: "Chainlink (simulé) a répondu." }, (signer) =>
        new Contract(DEPLOYMENT.VRFCoordinator, MOCK_VRF_ABI, signer).fulfillRandomWords(
          data.lastRequestId,
          DEPLOYMENT.BlockLucky
        )
      ),
    [send, data]
  );

  const clearTx = useCallback(() => setTx(IDLE_TX), []);
  const dismissAnnouncement = useCallback(() => setAnnouncement(null), []);

  const derived = useMemo(() => {
    if (!data) return null;
    const players = new Map();
    for (const address of data.tickets) {
      const key = address.toLowerCase();
      const entry = players.get(key) ?? { address, count: 0 };
      entry.count += 1;
      players.set(key, entry);
    }
    return {
      players: [...players.values()].sort((a, b) => b.count - a.count),
      retryAvailableAt: data.drawRequestedAt + data.drawTimeout,
      isOpen: data.state === STATE.OPEN,
      isCalculating: data.state === STATE.CALCULATING,
      isClosed: data.state === STATE.CLOSED,
    };
  }, [data]);

  return {
    network: TARGET,
    deployment: DEPLOYMENT,
    data,
    derived,
    loadError,
    activity,
    wallet: {
      available: Boolean(ethereum),
      account,
      chainId: walletChainId,
      wrongNetwork,
      isOwner,
      isPendingOwner,
    },
    tx,
    txInProgress,
    clearTx,
    announcement,
    dismissAnnouncement,
    connect,
    switchNetwork,
    buyTickets,
    requestDraw,
    retryDraw,
    withdrawPrize,
    startNewRound,
    transferOwnership,
    acceptOwnership,
    simulateChainlink,
  };
}
