import { useEffect, useMemo, useState } from "react";
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
import { TxStatus } from "../components/TxStatus";
import { usePageTitle } from "../hooks/usePageTitle";
import { deVille } from "../lib/format";
import { STATE } from "../config";
import { themeOrDefault } from "../themes";

/** Contrat d'une ville : son adresse, plus la config du réseau (coordinateur VRF, mock en local). */
export function cityDeployment(city) {
  return { ...(addresses[String(TARGET_CHAIN_ID)] || {}), BlockLucky: city.address, blockNumber: city.blockNumber };
}

/**
 * Applique le design choisi par la mairie à toute la page (en-tête compris), le temps de la visite.
 * `?design=<id>` dans l'adresse affiche un autre design sans l'enregistrer (aperçu depuis l'espace mairie).
 */
function useCityTheme(saved) {
  useEffect(() => {
    const preview = new URLSearchParams(window.location.search).get("design");
    const root = document.documentElement;
    root.dataset.theme = themeOrDefault(preview || saved);
    return () => {
      delete root.dataset.theme;
    };
  }, [saved]);
}

/** Loterie d'une ville : seuls les habitants inscrits par la mairie peuvent acheter des tickets. */
export function CityPage({ city, me }) {
  const deployment = useMemo(() => cityDeployment(city), [city]);
  const lottery = useBlockLucky(deployment);
  const now = useNow();
  const { data, derived, wallet, network, tx, txInProgress } = lottery;
  const [allowed, setAllowed] = useState(false);
  usePageTitle(`Loterie ${deVille(city.name)}`);
  useCityTheme(city.theme);
  // Vente ouverte : sur mobile, le panneau d'achat passe avant le billet (voir .play-grid.is-selling).
  const selling = Boolean(data && data.state === STATE.OPEN && !data.canDraw && data.endTime > now);

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

      <WalletNotice wallet={wallet} network={network} onSwitch={lottery.switchNetwork} />

      {lottery.loadError && (
        <div className="notice notice-warn" role="alert">
          <p>{lottery.loadError}</p>
        </div>
      )}

      {/* Sur mobile, .play-side s'efface (display: contents) : pendant la vente, l'achat passe avant le récapitulatif. */}
      <div className={`play-grid${selling ? " is-selling" : ""}`}>
        <LotteryStats data={data} now={now} cityName={city.name} />
        <div className="play-side">
          <WinnerBanner data={data} account={wallet.account} network={network} txInProgress={txInProgress} onWithdraw={lottery.withdrawPrize} />
          <DrawButton data={data} derived={derived} now={now} />
          <BuyTickets
            data={data}
            wallet={wallet}
            network={network}
            txInProgress={txInProgress}
            onBuy={lottery.buyTickets}
            onConnect={lottery.connect}
            now={now}
            allowed={allowed}
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
      />

      <WinnerAnnouncement announcement={lottery.announcement} account={wallet.account} onClose={lottery.dismissAnnouncement} />
      <TxStatus tx={tx} network={network} onClose={lottery.clearTx} />
    </main>
  );
}
