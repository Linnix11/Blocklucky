import { formatEth, shortAddress } from "../lib/format";

/** Bouton de connexion (en-tête) : connexion, ou adresse et solde une fois connecté. */
export function ConnectWallet({ wallet, balance, onConnect }) {
  if (!wallet.available) {
    return (
      <a className="btn btn-ghost" href="https://metamask.io/download/" target="_blank" rel="noreferrer">
        Installer MetaMask
      </a>
    );
  }
  if (!wallet.account) {
    return (
      <button type="button" className="btn btn-primary" onClick={onConnect}>
        Connecter mon portefeuille
      </button>
    );
  }
  return (
    <div className="wallet-chip" title={wallet.account}>
      <span className="wallet-dot" aria-hidden="true" />
      <span>{shortAddress(wallet.account)}</span>
      {balance !== undefined && balance !== null && <span className="wallet-balance">{formatEth(balance, { maxDigits: 3, eur: false })}</span>}
    </div>
  );
}

/** Bandeaux d'aide : pas de portefeuille installé, ou mauvais réseau. */
export function WalletNotice({ wallet, network, onSwitch, selling = false }) {
  // Sans portefeuille : une ligne discrète, la loterie reste au premier plan (on peut la suivre sans MetaMask).
  if (!wallet.available) {
    // Pendant la vente, le bloc d'achat propose déjà d'installer MetaMask : pas de doublon.
    if (selling) return null;
    return (
      <p className="wallet-hint" role="status">
        <span className="wallet-hint-icon" aria-hidden="true" />
        <span>Vous regardez sans portefeuille. Pour jouer, il faut l'extension gratuite MetaMask.</span>
        <a href="https://metamask.io/download/" target="_blank" rel="noreferrer">
          Installer
        </a>
      </p>
    );
  }
  if (wallet.wrongNetwork) {
    return (
      <div className="notice notice-warn" role="alert">
        <p>
          <strong>Votre portefeuille est sur un autre réseau.</strong> La loterie se joue sur {network.shortName},
          avec des ethers fictifs.
        </p>
        <button type="button" className="btn btn-primary" onClick={onSwitch}>
          Passer sur {network.shortName}
        </button>
      </div>
    );
  }
  return null;
}
