import { useEffect, useRef, useState } from "react";
import { STATE } from "../config";
import { formatEth, getEurRate } from "../lib/format";
import { MyTickets } from "./MyTickets";
import { cheer } from "./WinnerBanner";

const percent = (value) => `${value.toLocaleString("fr-FR", { maximumFractionDigits: value < 10 ? 1 : 0 })} %`;

/** Choix du nombre de tickets et achat. */
const STEPPER_FROM = 7; // au-delà de 6 tickets possibles, un compteur − / + remplace la rangée de jetons

/** Compteur − / + : le chiffre « saute » à chaque changement (clé React = valeur). */
function Stepper({ value, max, onChange }) {
  return (
    <div className="stepper" role="group" aria-label="Nombre de tickets">
      <button
        type="button"
        className="stepper-btn"
        onClick={() => onChange(value - 1)}
        disabled={value <= 1}
        aria-label="Un ticket de moins"
      >
        −
      </button>
      <output className="stepper-value" aria-live="polite">
        <span key={value}>{value}</span>
        <small>sur {max}</small>
      </output>
      <button
        type="button"
        className="stepper-btn"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label="Un ticket de plus"
      >
        +
      </button>
    </div>
  );
}

export function BuyTickets({
  data,
  wallet,
  network,
  txInProgress,
  onBuy,
  onConnect,
  now,
  allowed = true,
  proof = null,
  me = null,
}) {
  const [quantity, setQuantity] = useState(1);

  const myTickets = Number(data?.me?.myTickets ?? 0n);
  const maxPerWallet = Number(data?.maxTicketsPerWallet ?? 0n);
  const remaining = Math.max(0, maxPerWallet - myTickets);

  useEffect(() => {
    setQuantity((q) => Math.min(Math.max(1, q), Math.max(1, remaining)));
  }, [remaining]);

  // Confettis quand mes tickets augmentent (achat confirmé), pas au premier affichage ni au changement de loterie
  const seen = useRef(null);
  useEffect(() => {
    const key = `${data?.roundId}:${data?.me ? "on" : "off"}`;
    if (seen.current && seen.current.key === key && myTickets > seen.current.count) cheer();
    seen.current = { key, count: myTickets };
  }, [myTickets, data?.roundId, data?.me]);

  if (!data || data.roundId === 0n) return null;

  const saleOpen = data.state === STATE.OPEN && !data.canDraw && data.endTime > now;
  // Vente fermée et rien à montrer (pas de portefeuille ou pas de ticket) : la carte disparaît.
  if (!saleOpen && (!wallet.account || myTickets === 0)) return null;
  const cost = data.ticketPrice * BigInt(quantity);
  const balance = data.me?.balance;
  const notEnough = balance !== undefined && balance !== null && balance < cost;
  const totalTickets = data.tickets.length;
  const chanceNow = totalTickets > 0 && myTickets > 0 ? (myTickets / totalTickets) * 100 : null;
  const chanceAfter = ((myTickets + quantity) / (totalTickets + quantity)) * 100;

  let blocker = null;
  // L'inscription se vérifie avec l'adresse du portefeuille : on propose donc de le connecter avant de refuser.
  if (!saleOpen)
    blocker =
      data.state === STATE.CLOSED
        ? "Loterie terminée : merci d'avoir joué !"
        : "La vente est fermée. Bonne chance pour le tirage !";
  else if (!wallet.account) blocker = "connect";
  else if (!allowed) blocker = "not-allowed";
  else if (wallet.wrongNetwork) blocker = `Passez votre portefeuille sur ${network.shortName} pour jouer.`;
  else if (remaining === 0) blocker = `Vous avez déjà ${maxPerWallet} tickets, le maximum par personne.`;

  return (
    <section className="card buy reveal" aria-labelledby="buy-title">
      <h2 id="buy-title">{saleOpen ? "Acheter des tickets" : "Mes tickets"}</h2>

      {wallet.account && myTickets > 0 && (
        <p className="my-tickets">
          Vous avez <strong>{myTickets}</strong> ticket{myTickets > 1 ? "s" : ""} sur {maxPerWallet}
          {chanceNow !== null && <>, soit {percent(chanceNow)} de chances de gagner</>}.
        </p>
      )}

      {/* Monté dès la connexion (il ne s'affiche qu'avec des tickets) : il sait ainsi quels billets sont nouveaux */}
      {wallet.account && <MyTickets tickets={data.tickets} account={wallet.account} roundId={data.roundId} proof={proof} />}

      {/* La clé change avec l'étape : le contenu se fond à chaque changement (connexion, inscription, achat). */}
      {blocker === "connect" ? (
        <div className="stack swap-in" key="connect">
          <p>
            {!wallet.available
              ? "Pour acheter vos tickets, installez l'extension gratuite MetaMask : un portefeuille qui garde vos ethers de test."
              : allowed
              ? "Connectez votre portefeuille MetaMask pour acheter vos tickets."
              : me
              ? `Vous êtes connecté avec ${me.email}, mais ce mail n'est pas sur la liste des habitants de la ville. Connectez le portefeuille déclaré à votre mairie.`
              : "Réservé aux habitants inscrits par la mairie. Connectez le portefeuille déclaré à la mairie, ou connectez-vous avec votre mail."}
          </p>
          {wallet.available ? (
            <button type="button" className="btn btn-primary btn-block" onClick={onConnect}>
              Connecter mon portefeuille
            </button>
          ) : (
            <a className="btn btn-primary btn-block" href="https://metamask.io/download/" target="_blank" rel="noreferrer">
              Installer MetaMask
            </a>
          )}
          {!allowed && !me && (
            <a className="btn btn-ghost btn-block" href="/connexion">
              Me connecter avec mon mail
            </a>
          )}
        </div>
      ) : blocker === "not-allowed" ? (
        <div className="stack swap-in" key="not-allowed">
          <p className="muted">
            {me
              ? `Ni ce portefeuille ni votre mail (${me.email}) ne sont sur la liste des habitants de la ville. Demandez à votre mairie d'ajouter l'un des deux.`
              : "Ce portefeuille n'est pas dans la liste des habitants de la ville. Demandez à votre mairie de l'ajouter, ou connectez-vous avec le mail qu'elle a inscrit."}
          </p>
          {!me && (
            <a className="btn btn-ghost btn-block" href="/connexion">
              Me connecter avec mon mail
            </a>
          )}
        </div>
      ) : blocker ? (
        <p className="muted swap-in" key="blocker">
          {blocker}
        </p>
      ) : (
        <form
          key="form"
          className="stack swap-in"
          onSubmit={(event) => {
            event.preventDefault();
            onBuy(quantity);
          }}
        >
          <p className="hint">
            {formatEth(data.ticketPrice)} le ticket, {maxPerWallet} maximum par personne. Chaque ticket est une chance de plus.
            {getEurRate() && (
              <>
                {" "}
                <small>
                  Prix fixé en ETH : sa valeur en euros est indicative et varie avec le cours de l'ETH.
                </small>
              </>
            )}
          </p>
          {maxPerWallet >= STEPPER_FROM ? (
            <Stepper value={quantity} max={remaining} onChange={(n) => setQuantity(Math.min(Math.max(1, n), remaining))} />
          ) : (
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
          )}

          <p className="odds">
            <span>Vos chances après l'achat</span>
            <b key={quantity} className="odds-value">
              {percent(chanceAfter)}
            </b>
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
