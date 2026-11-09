import { useState } from "react";
import { isAddress, ZeroAddress } from "ethers";
import { DEMO_ROUND, STATE } from "../config";
import { explorerLink, formatDate, formatDuration, formatEth, sameAddress, shortAddress } from "../lib/format";

const STATE_LABEL = { [STATE.CLOSED]: "Fermée", [STATE.OPEN]: "Vente en cours", [STATE.CALCULATING]: "Tirage en cours" };

/**
 * Espace mairie (compte owner) : état de la loterie, tirage, ouverture d'une loterie, transfert de la mairie.
 * Le contrat ne donne volontairement aucun pouvoir sur le gagnant ni sur la cagnotte.
 */
export function AdminPanel({ data, derived, network, deployment, txInProgress, now, lottery }) {
  const [form, setForm] = useState(DEMO_ROUND);
  const [newOwner, setNewOwner] = useState("");
  if (!data || !derived) return null;

  const update = (field) => (event) => setForm((f) => ({ ...f, [field]: event.target.value }));
  const retryIn = derived.retryAvailableAt - now;
  const contractLink = explorerLink(network.explorer, "address", deployment.BlockLucky);
  const vrfLink = network.chainId === 11155111 ? `https://vrf.chain.link/sepolia/${data.subscriptionId}` : null;
  const ownerValid = isAddress(newOwner) && !sameAddress(newOwner, data.owner);
  const hasPending = data.pendingOwner && data.pendingOwner !== ZeroAddress;

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
        <button type="button" className="btn btn-wine btn-block" onClick={lottery.requestDraw} disabled={txInProgress}>
          Lancer le tirage
        </button>
      ) : derived.isCalculating && deployment.vrfMock ? (
        <button type="button" className="btn btn-ghost btn-block" onClick={lottery.simulateChainlink} disabled={txInProgress}>
          Simuler la réponse de Chainlink (réseau local)
        </button>
      ) : derived.isCalculating ? (
        retryIn <= 0 ? (
          <button type="button" className="btn btn-wine btn-block" onClick={lottery.retryDraw} disabled={txInProgress}>
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
            lottery.startNewRound(form);
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

      <h3>Transférer la mairie</h3>
      <p className="hint">
        Le nouveau compte devra accepter depuis ce site pour devenir la mairie. Tant qu'il n'a pas accepté, rien ne change.
        {hasPending && <> En attente d'acceptation par {shortAddress(data.pendingOwner)}.</>}
      </p>
      <form
        className="admin-form admin-form-single"
        onSubmit={(event) => {
          event.preventDefault();
          if (window.confirm(`Proposer la mairie à ${newOwner} ?`)) lottery.transferOwnership(newOwner);
        }}
      >
        <label>
          Adresse du nouveau compte
          <input
            type="text"
            inputMode="text"
            autoComplete="off"
            spellCheck="false"
            placeholder="0x…"
            value={newOwner}
            onChange={(event) => setNewOwner(event.target.value.trim())}
            aria-invalid={newOwner !== "" && !ownerValid}
          />
        </label>
        {newOwner !== "" && !ownerValid && <p className="hint">Adresse invalide ou déjà propriétaire.</p>}
        <button type="submit" className="btn btn-ghost btn-block" disabled={txInProgress || !ownerValid}>
          Proposer le transfert
        </button>
      </form>
    </section>
  );
}

/** Affiché au compte à qui la mairie a été proposée. */
export function AcceptOwnership({ txInProgress, onAccept }) {
  return (
    <section className="panel panel-admin" aria-labelledby="accept-title">
      <h2 id="accept-title">La mairie vous est proposée</h2>
      <p className="muted">Acceptez pour pouvoir ouvrir les prochaines loteries.</p>
      <button type="button" className="btn btn-gold btn-block" onClick={onAccept} disabled={txInProgress}>
        Accepter la mairie
      </button>
    </section>
  );
}
