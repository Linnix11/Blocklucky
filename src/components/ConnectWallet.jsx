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
      <button type="button" className="btn btn-gold" onClick={onConnect}>
        Connecter mon portefeuille
      </button>
    );
  }
  return (
    <div className="wallet-chip" title={wallet.account}>
      <span className="wallet-dot" aria-hidden="true" />
      <span>{shortAddress(wallet.account)}</span>
      {balance !== undefined && balance !== null && <span className="wallet-balance">{formatEth(balance, { maxDigits: 3 })}</span>}
    </div>
  );
}

/** Bandeaux d'aide : pas de portefeuille installé, ou mauvais réseau. */
export function WalletNotice({ wallet, network, onSwitch }) {
  if (!wallet.available) {
    return (
      <div className="notice" role="status">
        <p>
          <strong>Pour participer, il faut un portefeuille Ethereum.</strong> Vous pouvez suivre la loterie sans,
          mais pour acheter des tickets installez l'extension gratuite MetaMask.
        </p>
        <a className="btn btn-gold" href="https://metamask.io/download/" target="_blank" rel="noreferrer">
          Installer MetaMask
        </a>
      </div>
    );
  }
  if (wallet.wrongNetwork) {
    return (
      <div className="notice notice-warn" role="alert">
        <p>
          <strong>Votre portefeuille est sur un autre réseau.</strong> La loterie se joue sur {network.shortName},
          avec des ethers fictifs.
        </p>
        <button type="button" className="btn btn-gold" onClick={onSwitch}>
          Passer sur {network.shortName}
        </button>
      </div>
    );
  }
  return null;
}
