import { useEffect, useState } from "react";
import { STATE } from "../config";
import { formatEth } from "../lib/format";

/** Choix du nombre de tickets et achat. */
export function BuyTickets({ data, wallet, network, txInProgress, onBuy, onConnect, now, allowed = true }) {
  const [quantity, setQuantity] = useState(1);

  const myTickets = Number(data?.me?.myTickets ?? 0n);
  const maxPerWallet = Number(data?.maxTicketsPerWallet ?? 0n);
  const remaining = Math.max(0, maxPerWallet - myTickets);

  useEffect(() => {
    setQuantity((q) => Math.min(Math.max(1, q), Math.max(1, remaining)));
  }, [remaining]);

  if (!data || data.roundId === 0n) return null;

  const saleOpen = data.state === STATE.OPEN && !data.canDraw && data.endTime > now;
  const cost = data.ticketPrice * BigInt(quantity);
  const balance = data.me?.balance;
  const notEnough = balance !== undefined && balance !== null && balance < cost;
  const totalTickets = data.tickets.length;
  const chance = totalTickets > 0 && myTickets > 0 ? (myTickets / totalTickets) * 100 : null;

  let blocker = null;
  // L'inscription se vérifie avec l'adresse du portefeuille : on propose donc de le connecter avant de refuser.
  if (!saleOpen) blocker = "La vente de tickets est fermée pour cette loterie.";
  else if (!wallet.account) blocker = "connect";
  else if (!allowed) blocker = "not-allowed";
  else if (wallet.wrongNetwork) blocker = `Passez votre portefeuille sur ${network.shortName} pour acheter.`;
  else if (remaining === 0) blocker = `Vous avez déjà ${maxPerWallet} tickets, le maximum par portefeuille.`;

  return (
    <section className="panel" aria-labelledby="buy-title">
      <h2 id="buy-title">Mes tickets</h2>

      {wallet.account && (
        <p className="my-tickets">
          Vous avez <strong>{myTickets}</strong> ticket{myTickets > 1 ? "s" : ""} sur {maxPerWallet} possibles
          {chance !== null && <>, soit {chance.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} % de chances de gagner</>}.
        </p>
      )}

      {blocker === "connect" ? (
        <div className="stack">
          <p>
            {allowed
              ? "Connectez votre portefeuille pour acheter des tickets."
              : "Réservé aux habitants inscrits par la mairie. Connectez le portefeuille déclaré à la mairie, ou connectez-vous avec votre mail."}
          </p>
          <button type="button" className="btn btn-gold btn-block" onClick={onConnect} disabled={!wallet.available}>
            Connecter mon portefeuille
          </button>
          {!allowed && (
            <a className="btn btn-ghost btn-block" href="/connexion">
              Me connecter avec mon mail
            </a>
          )}
        </div>
      ) : blocker === "not-allowed" ? (
        <div className="stack">
          <p className="muted">
            Ce portefeuille n'est pas dans la liste des habitants de la ville. Demandez à votre mairie de l'ajouter, ou
            connectez-vous avec le mail qu'elle a inscrit.
          </p>
          <a className="btn btn-ghost btn-block" href="/connexion">
            Me connecter avec mon mail
          </a>
        </div>
      ) : blocker ? (
        <p className="muted">{blocker}</p>
      ) : (
        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault();
            onBuy(quantity);
          }}
        >
          <div className="stepper" role="group" aria-label="Nombre de tickets">
            <button
              type="button"
              className="stepper-btn"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              aria-label="Un ticket de moins"
            >
              −
            </button>
            <output className="stepper-value" aria-live="polite">
              {quantity} ticket{quantity > 1 ? "s" : ""}
            </output>
            <button
              type="button"
              className="stepper-btn"
              onClick={() => setQuantity((q) => Math.min(remaining, q + 1))}
              disabled={quantity >= remaining}
              aria-label="Un ticket de plus"
            >
              +
            </button>
          </div>

          <button type="submit" className="btn btn-gold btn-block btn-lg" disabled={txInProgress || notEnough}>
            Acheter pour {formatEth(cost)}
          </button>

          {notEnough && (
            <p className="field-error" role="alert">
              Solde insuffisant : vous avez {formatEth(balance)}.{" "}
              {network.faucet && (
                <a href={network.faucet} target="_blank" rel="noreferrer">
                  Obtenir des ETH de test gratuits
                </a>
              )}
            </p>
          )}
          <p className="hint">Chaque ticket est une chance de plus. Les frais de réseau sont payés en ETH de test.</p>
        </form>
      )}
    </section>
  );
}
