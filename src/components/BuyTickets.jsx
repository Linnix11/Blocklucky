import { useEffect, useState } from "react";
import { STATE } from "../config";
import { formatEth } from "../lib/format";
import { MyTickets } from "./MyTickets";

const percent = (value) => `${value.toLocaleString("fr-FR", { maximumFractionDigits: value < 10 ? 1 : 0 })} %`;

/** Choix du nombre de tickets et achat. */
export function BuyTickets({ data, wallet, network, txInProgress, onBuy, onConnect, now, allowed = true, proof = null }) {
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
  const chanceNow = totalTickets > 0 && myTickets > 0 ? (myTickets / totalTickets) * 100 : null;
  const chanceAfter = ((myTickets + quantity) / (totalTickets + quantity)) * 100;

  let blocker = null;
  // L'inscription se vérifie avec l'adresse du portefeuille : on propose donc de le connecter avant de refuser.
  if (!saleOpen) blocker = "La vente est fermée pour cette loterie.";
  else if (!wallet.account) blocker = "connect";
  else if (!allowed) blocker = "not-allowed";
  else if (wallet.wrongNetwork) blocker = `Passez votre portefeuille sur ${network.shortName} pour jouer.`;
  else if (remaining === 0) blocker = `Vous avez déjà ${maxPerWallet} tickets, le maximum par personne.`;

  return (
    <section className="card buy" aria-labelledby="buy-title">
      <h2 id="buy-title">{saleOpen ? "Acheter des tickets" : "Mes tickets"}</h2>

      {wallet.account && myTickets > 0 && (
        <p className="my-tickets">
          Vous avez <strong>{myTickets}</strong> ticket{myTickets > 1 ? "s" : ""} sur {maxPerWallet}
          {chanceNow !== null && <>, soit {percent(chanceNow)} de chances de gagner</>}.
        </p>
      )}

      {/* Monté dès la connexion (il ne s'affiche qu'avec des tickets) : il sait ainsi quels billets sont nouveaux */}
      {wallet.account && <MyTickets tickets={data.tickets} account={wallet.account} roundId={data.roundId} proof={proof} />}

      {blocker === "connect" ? (
        <div className="stack">
          <p>
            {allowed
              ? "Connectez votre portefeuille MetaMask pour acheter vos tickets."
              : "Réservé aux habitants inscrits par la mairie. Connectez le portefeuille déclaré à la mairie, ou connectez-vous avec votre mail."}
          </p>
          <button type="button" className="btn btn-primary btn-block" onClick={onConnect} disabled={!wallet.available}>
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
          <p className="hint">
            {formatEth(data.ticketPrice)} le ticket, {maxPerWallet} maximum par personne. Chaque ticket est une chance de plus.
          </p>
          <div className="quantity" role="group" aria-label="Nombre de tickets">
            {Array.from({ length: maxPerWallet }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                className="quantity-option"
                aria-pressed={quantity === n}
                aria-label={`${n} ticket${n > 1 ? "s" : ""}`}
                disabled={n > remaining}
                onClick={() => setQuantity(n)}
              >
                {n}
              </button>
            ))}
          </div>

          <p className="odds">
            <span>Vos chances après l'achat</span>
            <b>{percent(chanceAfter)}</b>
          </p>

          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={txInProgress || notEnough}>
            Acheter {quantity} ticket{quantity > 1 ? "s" : ""} pour {formatEth(cost)}
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
          <p className="hint center">MetaMask vous demandera de confirmer. Ethers fictifs, aucun vrai argent.</p>
        </form>
      )}
    </section>
  );
}
