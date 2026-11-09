import { WalletNotice } from "./ConnectWallet";
import { AcceptOwnership, AdminPanel } from "./AdminPanel";

/**
 * Page /#/admin : réservée au compte mairie.
 * La vraie protection est dans le contrat (onlyOwner) ; cette page évite seulement
 * d'afficher les outils de gestion au public.
 */
export function AdminPage({ lottery, now }) {
  const { data, derived, wallet, network, deployment, txInProgress } = lottery;

  let content;
  if (!deployment) {
    content = <p>La loterie n'est pas encore installée sur {network.name}.</p>;
  } else if (!wallet.available || !wallet.account) {
    content = (
      <section className="panel stack">
        <h2>Connexion mairie</h2>
        <p className="muted">Connectez le portefeuille de la mairie pour accéder à la gestion de la loterie.</p>
        <button type="button" className="btn btn-gold btn-block" onClick={lottery.connect} disabled={!wallet.available}>
          Connecter le portefeuille
        </button>
      </section>
    );
  } else if (!data) {
    content = <p className="muted">Chargement…</p>;
  } else if (wallet.isPendingOwner) {
    content = <AcceptOwnership txInProgress={txInProgress} onAccept={lottery.acceptOwnership} />;
  } else if (!wallet.isOwner) {
    content = (
      <section className="panel stack" role="alert">
        <h2>Accès refusé</h2>
        <p>Ce portefeuille n'est pas celui de la mairie. Changez de compte dans MetaMask.</p>
      </section>
    );
  } else {
    content = (
      <AdminPanel
        data={data}
        derived={derived}
        network={network}
        deployment={deployment}
        txInProgress={txInProgress}
        now={now}
        lottery={lottery}
      />
    );
  }

  return (
    <main className="page page-admin">
      <div className="intro">
        <h1>Espace mairie</h1>
        <p className="network-tag">
          <a href="#/">← Retour à la loterie</a>
        </p>
      </div>
      <WalletNotice wallet={wallet} network={network} onSwitch={lottery.switchNetwork} />
      {lottery.loadError && (
        <div className="notice notice-warn" role="alert">
          <p>{lottery.loadError}</p>
        </div>
      )}
      {content}
    </main>
  );
}
