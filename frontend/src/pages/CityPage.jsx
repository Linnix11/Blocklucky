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

/** Contrat d'une ville : son adresse, plus la config du réseau (coordinateur VRF, mock en local). */
export function cityDeployment(city) {
  return { ...(addresses[String(TARGET_CHAIN_ID)] || {}), BlockLucky: city.address, blockNumber: city.blockNumber };
}

/** Loterie d'une ville : seuls les habitants inscrits par la mairie peuvent acheter des tickets. */
export function CityPage({ city, me }) {
  const deployment = useMemo(() => cityDeployment(city), [city]);
  const lottery = useBlockLucky(deployment);
  const now = useNow();
  const { data, derived, wallet, network, tx, txInProgress } = lottery;
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const query = wallet.account ? `?wallet=${wallet.account}` : "";
    api(`/cities/${city.slug}/access${query}`)
      .then((r) => setAllowed(r.allowed))
      .catch(() => setAllowed(false));
  }, [city.slug, wallet.account, me]);

  return (
    <main className="page">
      <div className="intro">
        <p className="network-tag">
          <a href="#/">← Toutes les villes</a>
        </p>
        <h1>La loterie des fêtes de {city.name}</h1>
        <p className="network-tag">{network.name}, ethers fictifs, aucun vrai argent en jeu</p>
        <ConnectWallet wallet={wallet} balance={data?.me?.balance} onConnect={lottery.connect} />
      </div>

      <WalletNotice wallet={wallet} network={network} onSwitch={lottery.switchNetwork} />

      {lottery.loadError && (
        <div className="notice notice-warn" role="alert">
          <p>{lottery.loadError}</p>
        </div>
      )}

      <div className="play-grid">
        <LotteryStats data={data} now={now} />
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
        </div>
      </div>

      <HowItWorks network={network} />

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
