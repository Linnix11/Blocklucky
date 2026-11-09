import { useEffect } from "react";
import { explorerLink } from "../lib/format";

/** Suivi de la transaction en cours : à confirmer, envoyée, réussie ou en erreur. */
export function TxStatus({ tx, network, onClose }) {
  useEffect(() => {
    if (tx.status !== "success") return undefined;
    const timer = setTimeout(onClose, 6000);
    return () => clearTimeout(timer);
  }, [tx.status, onClose]);

  if (tx.status === "idle") return null;
  const href = tx.hash ? explorerLink(network.explorer, "tx", tx.hash) : null;

  return (
    <div className={`toast toast-${tx.status}`} role={tx.status === "error" ? "alert" : "status"} aria-live="polite">
      <div className="toast-body">
        {(tx.status === "wallet" || tx.status === "pending") && <span className="spinner" aria-hidden="true" />}
        <div>
          <p className="toast-title">
            {tx.status === "wallet" && `${tx.label} : confirmez dans votre portefeuille`}
            {tx.status === "pending" && `${tx.label} : validation par le réseau…`}
            {tx.status === "success" && tx.successText}
            {tx.status === "error" && `${tx.label} : action non effectuée`}
          </p>
          {tx.status === "pending" && <p className="toast-text">Cela prend en général 10 à 20 secondes.</p>}
          {tx.status === "error" && <p className="toast-text">{tx.error}</p>}
          {href && (
            <a href={href} target="_blank" rel="noreferrer" className="toast-link">
              Voir la transaction sur Etherscan
            </a>
          )}
        </div>
      </div>
      {(tx.status === "success" || tx.status === "error") && (
        <button type="button" className="toast-close" onClick={onClose} aria-label="Fermer le message">
          ×
        </button>
      )}
    </div>
  );
}
