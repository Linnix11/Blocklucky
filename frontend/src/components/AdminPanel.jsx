import { useState } from "react";
import { DEMO_ROUND, STATE } from "../config";

/** Espace mairie : ouverture d'une nouvelle loterie. Visible uniquement pour le compte owner. */
export function AdminPanel({ data, txInProgress, onStart }) {
  const [form, setForm] = useState(DEMO_ROUND);
  if (!data) return null;

  const update = (field) => (event) => setForm((f) => ({ ...f, [field]: event.target.value }));
  const canStart = data.state === STATE.CLOSED;

  return (
    <section className="panel panel-admin" aria-labelledby="admin-title">
      <h2 id="admin-title">Espace mairie</h2>
      <p className="muted">
        La mairie peut seulement ouvrir une loterie et choisir ses règles. Elle ne peut ni choisir le gagnant, ni
        retirer la cagnotte.
      </p>
      {canStart ? (
        <form
          className="admin-form"
          onSubmit={(event) => {
            event.preventDefault();
            onStart(form);
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
        <p>Une loterie est en cours. Vous pourrez en ouvrir une nouvelle après son tirage.</p>
      )}
    </section>
  );
}
