import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { TARGET } from "../config";
import { explorerLink, shortAddress } from "../lib/format";

const EMPTY = { name: "", email: "", password: "", contractAddress: "" };

/** Admin : création et suppression des mairies. Chaque mairie reçoit sa propre loterie (contrat). */
export function AdminPage({ onChange }) {
  const [cities, setCities] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api("/admin/cities").then(setCities), []);
  useEffect(() => {
    load();
  }, [load]);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const create = async (event) => {
    event.preventDefault();
    setBusy(true);
    setStatus({ type: "info", text: form.contractAddress ? "Création…" : "Déploiement de la loterie sur la blockchain (environ 30 s)…" });
    try {
      const city = await api("/admin/cities", { method: "POST", body: form });
      setStatus({ type: "ok", text: `Mairie créée. Loterie : ${city.address}` });
      setForm(EMPTY);
      await load();
      onChange();
    } catch (e) {
      setStatus({ type: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (city) => {
    if (!window.confirm(`Supprimer ${city.name}, son compte mairie et sa liste de participants ? Le contrat reste sur la blockchain.`)) return;
    setStatus(null);
    try {
      await api(`/admin/cities/${city.id}`, { method: "DELETE" });
      setStatus({ type: "ok", text: `${city.name} a été supprimée.` });
      await load();
      onChange();
    } catch (e) {
      setStatus({ type: "error", text: `Impossible de supprimer ${city.name} : ${e.message}` });
    }
  };

  return (
    <main className="page">
      <div className="intro">
        <h1>Administration</h1>
        <p className="network-tag">Création des comptes mairie et de leurs loteries</p>
      </div>

      <div className="admin-grid">
        <section className="panel stack" aria-labelledby="new-city">
          <h2 id="new-city">Nouvelle mairie</h2>
          <form className="admin-form admin-form-single" onSubmit={create}>
            <label>
              Nom de la ville
              <input required value={form.name} onChange={update("name")} placeholder="EtherBay" />
            </label>
            <label>
              Mail du compte mairie
              <input type="email" required value={form.email} onChange={update("email")} />
            </label>
            <label>
              Mot de passe du compte mairie
              <input type="text" required minLength={6} value={form.password} onChange={update("password")} autoComplete="off" />
            </label>
            <label>
              Contrat existant (facultatif)
              <input value={form.contractAddress} onChange={update("contractAddress")} placeholder="0x… vide = nouveau déploiement" />
            </label>
            {status && (
              <p className={status.type === "error" ? "form-error" : "hint"} role="status">
                {status.text}
              </p>
            )}
            <button type="submit" className="btn btn-gold btn-block" disabled={busy}>
              {busy ? "Création en cours…" : "Créer la mairie"}
            </button>
          </form>
        </section>

        <section className="panel stack" aria-labelledby="city-list">
          <h2 id="city-list">Mairies ({cities?.length ?? 0})</h2>
          {cities === null ? (
            <p className="muted">Chargement…</p>
          ) : cities.length === 0 ? (
            <p className="muted">Aucune mairie pour l'instant.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ville</th>
                    <th>Compte</th>
                    <th>Inscrits</th>
                    <th>Contrat</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {cities.map((city) => {
                    const link = explorerLink(TARGET.explorer, "address", city.address);
                    return (
                      <tr key={city.id}>
                        <td>
                          <a href={`/ville/${city.slug}`}>{city.name}</a>
                        </td>
                        <td>{city.mairieEmail}</td>
                        <td>{city.participants}</td>
                        <td>
                          {link ? (
                            <a href={link} target="_blank" rel="noreferrer">
                              {shortAddress(city.address)}
                            </a>
                          ) : (
                            shortAddress(city.address)
                          )}
                        </td>
                        <td>
                          <button type="button" className="link-button danger" onClick={() => remove(city)}>
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
