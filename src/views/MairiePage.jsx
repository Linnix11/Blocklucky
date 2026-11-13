import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useBlockLucky } from "../hooks/useBlockLucky";
import { useNow } from "../hooks/useNow";
import { AdminPanel } from "../components/AdminPanel";
import { ThemePicker } from "../components/ThemePicker";
import { useApp } from "../components/Shell";
import { themeOrDefault } from "../themes";
import { CUSTOM_THEME, customThemeVars } from "../lib/customTheme";
import { cityDeployment } from "./CityPage";
import { usePageTitle } from "../hooks/usePageTitle";
import { deVille } from "../lib/format";

/** Espace mairie : liste des habitants autorisés (CSV) et gestion de la loterie de la ville. */
export function MairiePage() {
  const [info, setInfo] = useState(null);
  const load = useCallback(() => api("/mairie").then(setInfo), []);
  useEffect(() => {
    load();
  }, [load]);
  usePageTitle(info ? `Mairie ${deVille(info.city.name)}` : "Espace mairie");

  if (!info) return <main className="page"><p className="muted">Chargement…</p></main>;

  return (
    <main className="page">
      <div className="intro">
        <h1>Mairie {deVille(info.city.name)}</h1>
        <p className="network-tag">
          <a href={`/ville/${info.city.slug}`}>Voir la page publique de la loterie →</a>
        </p>
      </div>
      <div className="admin-grid">
        <Participants list={info.participants} onChange={load} />
        <div className="stack">
          <Lottery city={info.city} />
          <Appearance city={info.city} onChange={load} />
        </div>
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
    end: () => {
      if (window.confirm("Arrêter la vente des tickets maintenant ? Le tirage pourra ensuite être lancé.")) {
        run("Fin de la vente", "end")();
      }
    },
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

/** Design de la page publique : la mairie le choisit parmi le catalogue (src/themes.js). */
function Appearance({ city, onChange }) {
  const { loadCities } = useApp();
  const saved = city.theme === CUSTOM_THEME && city.customTheme ? CUSTOM_THEME : themeOrDefault(city.theme);
  const [theme, setTheme] = useState(saved);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      await api("/mairie/theme", { method: "POST", body: { theme } });
      await Promise.all([onChange(), loadCities()]);
      setStatus({ type: "ok", text: "Design enregistré : la page publique l'affiche dès maintenant." });
    } catch (e) {
      setStatus({ type: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel stack" aria-labelledby="appearance-title">
      <h2 id="appearance-title">Apparence de la page publique</h2>
      <p className="muted">
        Choisissez le design que verront les habitants. « Aperçu » ouvre la page de la loterie avec ce design, sans
        l'enregistrer.
      </p>
      <form className="stack" onSubmit={save}>
        <ThemePicker value={theme} onChange={setTheme} previewSlug={city.slug} custom={city.customTheme} />
        {status && (
          <p className={status.type === "error" ? "form-error" : "hint"} role="status">
            {status.text}
          </p>
        )}
        <button type="submit" className="btn btn-primary btn-block" disabled={busy || theme === saved}>
          {busy ? "Enregistrement…" : theme === saved ? "Design actuel" : "Enregistrer ce design"}
        </button>
      </form>
      <CustomDesign
        onSaved={async () => {
          await Promise.all([onChange(), loadCities()]);
          setTheme(CUSTOM_THEME);
          setStatus({ type: "ok", text: "Design personnalisé enregistré : la page publique l'affiche dès maintenant." });
        }}
      />
    </section>
  );
}

const DESCRIPTION_MAX = 600;

/** Variables CSS du design (sans color-scheme, que React n'accepte pas sous ce nom dans `style`). */
const previewStyle = (theme) =>
  Object.fromEntries(Object.entries(customThemeVars(theme)).filter(([name]) => name.startsWith("--")));

/** Aperçu miniature d'un design personnalisé : ses variables CSS ne s'appliquent qu'à ce cadre. */
function CustomPreview({ theme }) {
  return (
    <div className="custom-preview" style={previewStyle(theme)} aria-label={`Aperçu du design ${theme.name}`} role="img">
      <div className="custom-preview-header">
        <span className="custom-preview-mark" />
        <span>BlockLucky</span>
      </div>
      <div className="custom-preview-body">
        <p className="custom-preview-title">Loterie de votre ville</p>
        <div className="custom-preview-card">
          <span className="custom-preview-number">Loterie n° 1</span>
          <span className="custom-preview-pot">0,004 ETH</span>
          <span className="custom-preview-text">Toute la cagnotte est reversée au gagnant.</span>
          <span className="custom-preview-button">Acheter 2 tickets</span>
        </div>
      </div>
    </div>
  );
}

/** « Aucun design ne convient ? » : la mairie décrit son style, Gemini propose un design, elle l'adopte ou non. */
function CustomDesign({ onSaved }) {
  const [description, setDescription] = useState("");
  const [proposal, setProposal] = useState(null);
  const [state, setState] = useState(null); // { type: "busy" | "error", text }

  const generate = async (event) => {
    event.preventDefault();
    setState({ type: "busy", text: "Gemini prépare une proposition (cela peut prendre jusqu'à une minute)…" });
    try {
      const { theme } = await api("/mairie/theme/generate", { method: "POST", body: { description } });
      setProposal(theme);
      setState(null);
    } catch (e) {
      setState({ type: "error", text: e.message });
    }
  };

  const adopt = async () => {
    setState({ type: "busy", text: "Enregistrement…" });
    try {
      await api("/mairie/theme", { method: "POST", body: { theme: CUSTOM_THEME, custom: proposal } });
      setProposal(null);
      setState(null);
      await onSaved();
    } catch (e) {
      setState({ type: "error", text: e.message });
    }
  };

  const busy = state?.type === "busy";
  return (
    <details className="custom-design">
      <summary>Aucun design ne convient ? Décrivez le vôtre</summary>
      <form className="stack" onSubmit={generate}>
        <label className="field">
          <span>Style souhaité</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={DESCRIPTION_MAX}
            rows={4}
            required
            minLength={10}
            placeholder="Par exemple : bleu marine et or, élégant, pour une ville d'art et d'histoire au bord de la Loire."
          />
          <span className="hint">
            Couleurs, ambiance, caractère de la ville… Gemini (Google) propose un design, toujours lisible et
            accessible. N'indiquez pas de données personnelles. {description.length}/{DESCRIPTION_MAX}
          </span>
        </label>
        <button type="submit" className="btn btn-ghost btn-block" disabled={busy || description.trim().length < 10}>
          {proposal ? "Proposer autre chose" : "Générer une proposition"}
        </button>
      </form>

      {state && (
        <p className={state.type === "error" ? "form-error" : "hint"} role="status">
          {state.type === "busy" && <span className="spinner" aria-hidden="true" />} {state.text}
        </p>
      )}

      {proposal && (
        <div className="stack custom-proposal">
          <p>
            <strong>{proposal.name}</strong>
            {proposal.description && <> : {proposal.description}</>}
          </p>
          <CustomPreview theme={proposal} />
          <button type="button" className="btn btn-primary btn-block" onClick={adopt} disabled={busy}>
            Utiliser ce design
          </button>
        </div>
      )}
    </details>
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
        <span className="btn btn-primary btn-block">Importer un CSV</span>
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
