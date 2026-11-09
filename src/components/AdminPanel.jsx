import { useState } from "react";
import { DEMO_ROUND, STATE } from "../config";
import { explorerLink, formatDate, formatDuration, formatEth } from "../lib/format";

const STATE_LABEL = { [STATE.CLOSED]: "Fermée", [STATE.OPEN]: "Vente en cours", [STATE.CALCULATING]: "Tirage en cours" };

/**
 * Gestion de la loterie d'une mairie : état, tirage, ouverture d'une loterie.
 * Les actions passent par le serveur (`actions`), qui signe avec sa clé : pas besoin de MetaMask.
 * Le contrat ne donne volontairement aucun pouvoir sur le gagnant ni sur la cagnotte.
 */
export function AdminPanel({ data, derived, network, deployment, now, busy: txInProgress, actions }) {
  const [form, setForm] = useState(DEMO_ROUND);
  if (!data || !derived) return null;

  const update = (field) => (event) => setForm((f) => ({ ...f, [field]: event.target.value }));
  const retryIn = derived.retryAvailableAt - now;
  const contractLink = explorerLink(network.explorer, "address", deployment.BlockLucky);
  const vrfLink = network.chainId === 11155111 ? `https://vrf.chain.link/sepolia/${data.subscriptionId}` : null;

  return (
    <section className="panel panel-admin stack" aria-labelledby="admin-title">
      <h2 id="admin-title">Gestion de la loterie</h2>
      <p className="muted">
        La mairie ouvre les loteries et choisit leurs règles. Elle ne peut ni choisir le gagnant, ni retirer la cagnotte.
      </p>

      <dl className="admin-status">
        <dt>Loterie</dt>
        <dd>n° {String(data.roundId)} · {STATE_LABEL[data.state]}</dd>
        <dt>Cagnotte</dt>
        <dd>{formatEth(data.pot)}</dd>
        <dt>Participants</dt>
        <dd>
          {String(data.participantsCount)} / {String(data.maxParticipants)} · {data.tickets.length} tickets
        </dd>
        {data.endTime > 0 && (
          <>
            <dt>Fin</dt>
            <dd>{formatDate(data.endTime)}</dd>
          </>
        )}
      </dl>
      <p className="hint">
        {contractLink && (
          <a href={contractLink} target="_blank" rel="noreferrer">
            Contrat sur l'explorateur
          </a>
        )}
        {vrfLink && (
          <>
            {" · "}
            <a href={vrfLink} target="_blank" rel="noreferrer">
              Souscription Chainlink (LINK restants)
            </a>
          </>
        )}
      </p>

      <h3>Tirage</h3>
      {data.canDraw ? (
        <button type="button" className="btn btn-wine btn-block" onClick={actions.draw} disabled={txInProgress}>
          Lancer le tirage
        </button>
      ) : derived.isCalculating ? (
        retryIn <= 0 ? (
          <button type="button" className="btn btn-wine btn-block" onClick={actions.retry} disabled={txInProgress}>
            Relancer le tirage (Chainlink n'a pas répondu)
          </button>
        ) : (
          <p className="hint">
            En attente de Chainlink. Relance possible dans {formatDuration(retryIn)} si rien n'arrive.
          </p>
        )
      ) : derived.isOpen ? (
        <p className="hint">
          Le tirage sera possible à la fin de la vente : {String(data.maxParticipants)} participants ou{" "}
          {formatDate(data.endTime)}.
        </p>
      ) : (
        <p className="hint">Aucune loterie en cours.</p>
      )}

      <h3>Nouvelle loterie</h3>
      {derived.isClosed ? (
        <form
          className="admin-form"
          onSubmit={(event) => {
            event.preventDefault();
            actions.start(form);
          }}
        >
          <label>
            Prix du ticket (ETH)
            <input type="number" min="0.000001" step="0.000001" required value={form.priceEth} onChange={update("priceEth")} />
          </label>
          <label>
            Participants pour clore
            <input type="number" min="1" step="1" required value={form.maxParticipants} onChange={update("maxParticipants")} />
          </label>
          <label>
            Tickets max par portefeuille
            <input type="number" min="1" step="1" required value={form.maxTicketsPerWallet} onChange={update("maxTicketsPerWallet")} />
          </label>
          <label>
            Durée (minutes)
            <input type="number" min="1" step="1" required value={form.durationMinutes} onChange={update("durationMinutes")} />
          </label>
          <button type="submit" className="btn btn-gold btn-block" disabled={txInProgress}>
            Ouvrir la loterie
          </button>
        </form>
      ) : (
        <p className="hint">Possible une fois la loterie en cours tirée.</p>
      )}

    </section>
  );
}
