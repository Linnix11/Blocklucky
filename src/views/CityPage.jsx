import { useEffect, useMemo, useRef, useState } from "react";
import addresses from "../contracts/addresses.json";
import { TARGET_CHAIN_ID } from "../config";
import { api } from "../lib/api";
import { useBlockLucky } from "../hooks/useBlockLucky";
import { useNow } from "../hooks/useNow";
import { ConnectWallet, WalletNotice } from "../components/ConnectWallet";
import { LotteryStats } from "../components/LotteryStats";
import { BuyTickets } from "../components/BuyTickets";
import { DrawButton } from "../components/DrawButton";
import { WinnerAnnouncement, WinnerBanner } from "../components/WinnerBanner";
import { Transparency } from "../components/Transparency";
import { HowItWorks } from "../components/HowItWorks";
import { LastWinners, Ticker } from "../components/Fairground";
import { TxStatus } from "../components/TxStatus";
import { usePageTitle } from "../hooks/usePageTitle";
import { deVille } from "../lib/format";
import { STATE } from "../config";
import { themeOrDefault } from "../themes";
import { CUSTOM_THEME, customThemeVars } from "../lib/customTheme";

/** Contrat d'une ville : son adresse, plus la config du réseau (coordinateur VRF, mock en local). */
export function cityDeployment(city) {
  return { ...(addresses[String(TARGET_CHAIN_ID)] || {}), BlockLucky: city.address, blockNumber: city.blockNumber };
}

/**
 * Applique le design choisi par la mairie à toute la page (en-tête compris), le temps de la visite.
 * `?design=<id>` dans l'adresse affiche un autre design sans l'enregistrer (aperçu depuis l'espace mairie).
 */
export function useCityTheme(saved, custom) {
  useEffect(() => {
    const preview = new URLSearchParams(window.location.search).get("design");
    const wanted = preview || saved;
    const root = document.documentElement;
    // Design personnalisé : ses variables CSS sont posées directement sur <html>, puis retirées en quittant la page.
    const vars = wanted === CUSTOM_THEME && custom ? customThemeVars(custom) : null;
    root.dataset.theme = vars ? CUSTOM_THEME : themeOrDefault(wanted);
    if (vars) for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value);
    return () => {
      delete root.dataset.theme;
      if (vars) for (const name of Object.keys(vars)) root.style.removeProperty(name);
    };
  }, [saved, custom]);
}

/** Loterie d'une ville : seuls les habitants inscrits par la mairie peuvent acheter des tickets. */
export function CityPage({ city, me }) {
  const deployment = useMemo(() => cityDeployment(city), [city]);
  const lottery = useBlockLucky(deployment);
  const now = useNow();
  const { data, derived, wallet, network, tx, txInProgress } = lottery;
  const [allowed, setAllowed] = useState(false);
  usePageTitle(`Loterie ${deVille(city.name)}`);
  useCityTheme(city.theme, city.customTheme);
  // Vente ouverte : sur mobile, le panneau d'achat passe avant le billet (voir .play-grid.is-selling).
  const selling = Boolean(data && data.state === STATE.OPEN && !data.canDraw && data.endTime > now);
  // Vente finie ou tirage en cours : sur mobile, le panneau du tirage passe juste sous le billet.
  const drawing = Boolean(data && data.roundId > 0n && (data.canDraw || data.state === STATE.CALCULATING));

  // Arrivée depuis l'app iPhone (`?acheter=1`, ouvert dans le navigateur de MetaMask) : on connecte le portefeuille,
  // on passe sur le bon réseau et on amène l'habitant directement au panneau d'achat. Une seule fois par visite.
  // Chaque étape n'est tentée qu'une fois : si l'habitant refuse, on ne lui redemande pas en boucle.
  const buyIntent = useRef(typeof window !== "undefined" && new URLSearchParams(window.location.search).has("acheter"));
  const buyStep = useRef(null);
  useEffect(() => {
    if (!buyIntent.current || !wallet.available || !data) return;
    // Étape à faire maintenant : connexion, puis changement de réseau, puis rien (on descend à l'achat).
    const step = !wallet.account ? "connect" : wallet.wrongNetwork ? "network" : null;
    if (step) {
      if (buyStep.current !== step) {
        buyStep.current = step;
        if (step === "connect") lottery.connect();
        else lottery.switchNetwork();
      }
      return;
    }
    buyIntent.current = false;
    window.history.replaceState(null, "", window.location.pathname); // un rechargement ne relance pas la connexion
    document.getElementById("buy-title")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [wallet.available, wallet.account, wallet.wrongNetwork, data, lottery]);

  useEffect(() => {
    // Seule la réponse à la dernière demande compte : sinon une réponse plus ancienne (sans portefeuille)
    // peut arriver après et refuser à tort un habitant inscrit.
    let current = true;
    const query = wallet.account ? `?wallet=${wallet.account}` : "";
    api(`/cities/${city.slug}/access${query}`)
      .then((r) => current && setAllowed(r.allowed))
      .catch(() => current && setAllowed(false));
    return () => {
      current = false;
    };
  }, [city.slug, wallet.account, me]);

  return (
    <main className="page">
      <div className="intro">
        <p className="network-tag">
          <a href="/">← Toutes les villes</a>
        </p>
        <h1 className={city.name.length > 18 ? "is-long" : undefined}>Loterie {deVille(city.name)}</h1>
        {selling && <p className="live-badge">Vente ouverte</p>}
        <p className="network-tag">{network.name}, ethers fictifs, aucun vrai argent en jeu</p>
        {/* Sans MetaMask, le bandeau juste en dessous explique quoi installer : pas de second bouton ici. */}
        {wallet.available && <ConnectWallet wallet={wallet} balance={data?.me?.balance} onConnect={lottery.connect} />}
      </div>

      <Ticker data={data} now={now} />

      <WalletNotice wallet={wallet} network={network} onSwitch={lottery.switchNetwork} selling={selling} />

      {lottery.loadError && (
        <div className="notice notice-warn" role="alert">
          <p>{lottery.loadError}</p>
        </div>
      )}

      {/* Sur mobile, .play-side s'efface (display: contents) : pendant la vente, l'achat passe avant le récapitulatif. */}
      <div className={`play-grid${selling ? " is-selling" : ""}${drawing ? " is-drawing" : ""}`}>
        <div className="play-main">
          <LotteryStats data={data} now={now} cityName={city.name} />
          <LastWinners data={data} account={wallet.account} />
        </div>
        <div className="play-side">
          <WinnerBanner data={data} account={wallet.account} network={network} txInProgress={txInProgress} onWithdraw={lottery.withdrawPrize} />
          <DrawButton
            data={data}
            derived={derived}
            now={now}
            wallet={wallet}
            network={network}
            txInProgress={txInProgress}
            onDraw={lottery.requestDraw}
            onRetry={lottery.retryDraw}
            onConnect={lottery.connect}
            onSimulate={lottery.simulateChainlink}
          />
          <BuyTickets
            data={data}
            wallet={wallet}
            network={network}
            txInProgress={txInProgress}
            onBuy={lottery.buyTickets}
            onConnect={lottery.connect}
            now={now}
            allowed={allowed}
            proof={lottery.proof}
            me={me}
          />
          <HowItWorks network={network} />
        </div>
      </div>

      <Transparency
        data={data}
        derived={derived}
        activity={lottery.activity}
        network={network}
        deployment={deployment}
        account={wallet.account}
        proof={lottery.proof}
      />

      <WinnerAnnouncement
        announcement={lottery.announcement}
        proof={lottery.proof}
        tickets={data?.tickets}
        account={wallet.account}
        onClose={lottery.dismissAnnouncement}
      />
      <TxStatus tx={tx} network={network} onClose={lottery.clearTx} />
    </main>
  );
}
