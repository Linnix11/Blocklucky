import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useBlockLucky } from "../hooks/useBlockLucky";
import { useNow } from "../hooks/useNow";
import { AdminPanel } from "../components/AdminPanel";
import { cityDeployment } from "./CityPage";

/** Espace mairie : liste des habitants autorisés (CSV) et gestion de la loterie de la ville. */
export function MairiePage() {
  const [info, setInfo] = useState(null);
  const load = useCallback(() => api("/mairie").then(setInfo), []);
  useEffect(() => {
    load();
  }, [load]);

  if (!info) return <main className="page"><p className="muted">Chargement…</p></main>;

  return (
    <main className="page">
      <div className="intro">
        <h1>Mairie de {info.city.name}</h1>
        <p className="network-tag">
          <a href={`/ville/${info.city.slug}`}>Voir la page publique de la loterie →</a>
        </p>
      </div>
      <div className="admin-grid">
        <Participants list={info.participants} onChange={load} />
        <Lottery city={info.city} />
      </div>
    </main>
  );
}

function Lottery({ city }) {
  const deployment = useMemo(() => cityDeployment(city), [city]);
  const lottery = useBlockLucky(deployment);
  const now = useNow();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  const run = (label, path, body) => async () => {
    setBusy(true);
    setStatus({ type: "info", text: `${label} : transaction en cours (environ 15 s)…` });
    try {
      await api(`/mairie/${path}`, { method: "POST", body });
      setStatus({ type: "ok", text: `${label} : fait.` });
    } catch (e) {
      setStatus({ type: "error", text: `${label} : ${e.message}` });
    } finally {
      setBusy(false);
    }
  };

  const actions = {
    start: (form) => run("Ouverture de la loterie", "round", form)(),
    draw: run("Lancement du tirage", "draw"),
    retry: run("Relance du tirage", "retry"),
  };

  return (
    <div className="stack">
      {status && (
        <p className={status.type === "error" ? "form-error" : "hint"} role="status">
          {status.text}
        </p>
      )}
      <AdminPanel
        data={lottery.data}
        derived={lottery.derived}
        network={lottery.network}
        deployment={deployment}
        now={now}
        busy={busy}
        actions={actions}
      />
    </div>
  );
}

function Participants({ list, onChange }) {
  const [replace, setReplace] = useState(false);
  const [manual, setManual] = useState("");
  const [filter, setFilter] = useState("");
  const [status, setStatus] = useState(null);

  const send = async (csv) => {
    setStatus(null);
    try {
      const { added } = await api("/mairie/participants", { method: "POST", body: { csv, replace } });
      setStatus({ type: "ok", text: `${added} habitant(s) importé(s).` });
      await onChange();
      return true;
    } catch (e) {
      setStatus({ type: "error", text: e.message });
      return false;
    }
  };

  const onFile = async (event) => {
    const file = event.target.files?.[0];
    if (file) await send(await file.text());
    event.target.value = "";
  };

  // Retrait immédiat, annulable pendant quelques secondes (pas de boîte de confirmation : l'action est réversible).
  const remove = async (identifier) => {
    setStatus(null);
    try {
      await api(`/mairie/participants/${encodeURIComponent(identifier)}`, { method: "DELETE" });
      setStatus({ type: "ok", text: `${identifier} a été retiré de la liste.`, undo: identifier });
      await onChange();
    } catch (e) {
      setStatus({ type: "error", text: `Impossible de retirer ${identifier} : ${e.message}` });
    }
  };

  const undoRemove = async (identifier) => {
    setStatus(null);
    try {
      // Toujours en ajout, quelle que soit la case « Remplacer toute la liste ».
      await api("/mairie/participants", { method: "POST", body: { csv: identifier, replace: false } });
      setStatus({ type: "ok", text: `${identifier} est de nouveau dans la liste.` });
      await onChange();
    } catch (e) {
      setStatus({ type: "error", text: `Impossible de remettre ${identifier} : ${e.message}` });
    }
  };

  // Le bouton « Annuler » disparaît après 10 secondes.
  useEffect(() => {
    if (!status?.undo) return undefined;
    const timer = setTimeout(() => setStatus((s) => (s?.undo ? { type: s.type, text: s.text } : s)), 10000);
    return () => clearTimeout(timer);
  }, [status]);

  const shown = list.filter((id) => id.includes(filter.trim().toLowerCase())).slice(0, 200);

  return (
    <section className="panel stack" aria-labelledby="participants-title">
      <h2 id="participants-title">Habitants autorisés ({list.length})</h2>
      <p className="muted">
        Seuls ces habitants peuvent acheter des tickets. Importez un CSV contenant des mails ou des adresses MetaMask
        (0x…), une par ligne ou séparées par des virgules. Les autres colonnes sont ignorées.
      </p>

      <label className="file-input">
        <span className="btn btn-gold btn-block">Importer un fichier CSV</span>
        <input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={onFile} />
      </label>
      <label className="checkbox">
        <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
        Remplacer toute la liste (sinon les habitants sont ajoutés)
      </label>

      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault();
          send(manual).then((ok) => ok && setManual(""));
        }}
      >
        <label className="visually-hidden" htmlFor="manual-add">
          Ajouter un mail ou une adresse
        </label>
        <input id="manual-add" value={manual} onChange={(e) => setManual(e.target.value)} placeholder="mail ou 0x…" />
        <button type="submit" className="btn btn-ghost" disabled={!manual.trim()}>
          Ajouter
        </button>
      </form>

      {status && (
        <p className={status.type === "error" ? "form-error" : "hint"} role="status">
          {status.text}
          {status.undo && (
            <>
              {" "}
              <button type="button" className="link-button" onClick={() => undoRemove(status.undo)}>
                Annuler
              </button>
            </>
          )}
        </p>
      )}

      {list.length > 0 && (
        <>
          <input
            className="search-input"
            type="search"
            aria-label="Rechercher un habitant"
            placeholder="Rechercher…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <ul className="participant-list">
            {shown.map((id) => (
              <li key={id}>
                <span>{id}</span>
                <button type="button" className="link-button danger" onClick={() => remove(id)} aria-label={`Retirer ${id}`}>
                  Retirer
                </button>
              </li>
            ))}
          </ul>
          {list.length > shown.length && !filter && <p className="hint">200 premiers affichés, utilisez la recherche.</p>}
        </>
      )}
    </section>
  );
}
