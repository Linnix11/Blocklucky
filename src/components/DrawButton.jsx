import { formatDuration } from "../lib/format";

/** Page publique : informe sur le tirage. Les actions (lancer, relancer) sont dans l'espace mairie. */
export function DrawButton({ data, derived, now }) {
  if (!data || !derived) return null;

  if (data.canDraw && data.tickets.length === 0) {
    return (
      <section className="panel panel-draw" aria-labelledby="draw-title">
        <h2 id="draw-title">La vente est terminée</h2>
        <p>Aucun ticket n'a été vendu : la mairie va clôturer cette loterie sans gagnant, puis pourra en ouvrir une nouvelle.</p>
      </section>
    );
  }

  if (data.canDraw) {
    return (
      <section className="panel panel-draw" aria-labelledby="draw-title">
        <h2 id="draw-title">La vente est terminée</h2>
        <p>
          La mairie va lancer le tirage. Le gagnant est choisi par Chainlink, un service de hasard vérifiable : personne
          ne peut influencer le résultat.
        </p>
      </section>
    );
  }

  if (derived.isCalculating) {
    const retryIn = derived.retryAvailableAt - now;
    return (
      <section className="panel panel-draw" aria-labelledby="draw-title" aria-live="polite">
        <h2 id="draw-title">
          <span className="spinner" aria-hidden="true" /> Tirage en cours
        </h2>
        <p>
          Chainlink calcule un nombre aléatoire et la preuve qu'il n'a pas été truqué. Cela prend en général une à
          trois minutes. Le gagnant s'affichera ici automatiquement.
        </p>
        {retryIn > 0 && <p className="hint">Sans réponse, la mairie pourra relancer le tirage dans {formatDuration(retryIn)}.</p>}
      </section>
    );
  }

  return null;
}
