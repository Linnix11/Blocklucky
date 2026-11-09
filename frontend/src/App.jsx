import { useBlockLucky } from "./hooks/useBlockLucky";
import { useNow } from "./hooks/useNow";
import { ConnectWallet, WalletNotice } from "./components/ConnectWallet";
import { LotteryStats } from "./components/LotteryStats";
import { BuyTickets } from "./components/BuyTickets";
import { DrawButton } from "./components/DrawButton";
import { WinnerAnnouncement, WinnerBanner } from "./components/WinnerBanner";
import { Transparency } from "./components/Transparency";
import { HowItWorks } from "./components/HowItWorks";
import { AcceptOwnership, AdminPanel } from "./components/AdminPanel";
import { TxStatus } from "./components/TxStatus";

export default function App() {
  const lottery = useBlockLucky();
  const now = useNow();
  const { data, derived, wallet, network, deployment, tx, txInProgress } = lottery;

  return (
    <>
      <div className="lights" aria-hidden="true" />
      <header className="site-header">
        <div className="brand">
          <span className="brand-name">BlockLucky</span>
          <span className="brand-city">Ville d'EtherBay</span>
        </div>
        <ConnectWallet wallet={wallet} balance={data?.me?.balance} onConnect={lottery.connect} />
      </header>

      <main className="page">
        <div className="intro">
          <h1>La loterie des fêtes, tirée au sort sous les yeux de tous.</h1>
          <p className="network-tag">
            {network.name}, ethers fictifs, aucun vrai argent en jeu
          </p>
        </div>

        <WalletNotice wallet={wallet} network={network} onSwitch={lottery.switchNetwork} />

        {!deployment ? (
          <div className="notice notice-warn" role="alert">
            <p>
              <strong>La loterie n'est pas encore installée sur {network.name}.</strong> En local : lancez
              « npx hardhat node » puis « npm run deploy:local ».
            </p>
          </div>
        ) : (
          <>
            {lottery.loadError && (
              <div className="notice notice-warn" role="alert">
                <p>{lottery.loadError}</p>
              </div>
            )}

            <div className="play-grid">
              <LotteryStats data={data} now={now} />
              <div className="play-side">
                <WinnerBanner
                  data={data}
                  account={wallet.account}
                  network={network}
                  txInProgress={txInProgress}
                  onWithdraw={lottery.withdrawPrize}
                />
                <DrawButton
                  data={data}
                  derived={derived}
                  wallet={wallet}
                  deployment={deployment}
                  txInProgress={txInProgress}
                  now={now}
                  onDraw={lottery.requestDraw}
                  onRetry={lottery.retryDraw}
                  onSimulate={lottery.simulateChainlink}
                  onConnect={lottery.connect}
                />
                <BuyTickets
                  data={data}
                  wallet={wallet}
                  network={network}
                  txInProgress={txInProgress}
                  onBuy={lottery.buyTickets}
                  onConnect={lottery.connect}
                  now={now}
                />
                {wallet.isOwner && (
                  <AdminPanel
                    data={data}
                    derived={derived}
                    network={network}
                    deployment={deployment}
                    txInProgress={txInProgress}
                    now={now}
                    lottery={lottery}
                  />
                )}
                {wallet.isPendingOwner && <AcceptOwnership txInProgress={txInProgress} onAccept={lottery.acceptOwnership} />}
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
          </>
        )}
      </main>

      <footer className="site-footer">
        <p>
          BlockLucky, un projet de la mairie d'EtherBay et d'Epitech Digital School. Loterie de démonstration sur
          réseau de test : les ethers utilisés n'ont aucune valeur.
        </p>
      </footer>

      <WinnerAnnouncement announcement={lottery.announcement} account={wallet.account} onClose={lottery.dismissAnnouncement} />
      <TxStatus tx={tx} network={network} onClose={lottery.clearTx} />
    </>
  );
}
