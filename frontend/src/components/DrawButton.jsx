import { formatDuration } from "../lib/format";

/**
 * Tirage : visible quand canDraw() est vrai (n'importe qui peut le lancer),
 * puis suivi du tirage en cours, avec relance possible après 1 h sans réponse.
 */
export function DrawButton({ data, derived, wallet, deployment, txInProgress, now, onDraw, onRetry, onSimulate, onConnect }) {
  if (!data || !derived) return null;

  if (data.canDraw) {
    return (
      <section className="panel panel-draw" aria-labelledby="draw-title">
        <h2 id="draw-title">La vente est terminée</h2>
        <p>
          N'importe qui peut lancer le tirage, la mairie comme les habitants. Le gagnant est choisi par Chainlink, un
          service de hasard vérifiable : personne ne peut influencer le résultat.
        </p>
        {wallet.account ? (
          <button type="button" className="btn btn-wine btn-block btn-lg" onClick={onDraw} disabled={txInProgress || wallet.wrongNetwork}>
            Lancer le tirage
          </button>
        ) : (
          <button type="button" className="btn btn-gold btn-block" onClick={onConnect} disabled={!wallet.available}>
            Connecter mon portefeuille pour lancer le tirage
          </button>
        )}
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
        {deployment?.vrfMock && (
          <button type="button" className="btn btn-ghost btn-block" onClick={onSimulate} disabled={txInProgress || !wallet.account}>
            Simuler la réponse de Chainlink (réseau local)
          </button>
        )}
        {retryIn <= 0 ? (
          <button type="button" className="btn btn-ghost btn-block" onClick={onRetry} disabled={txInProgress || !wallet.account}>
            Relancer le tirage
          </button>
        ) : (
          <p className="hint">Sans réponse, le tirage pourra être relancé par n'importe qui dans {formatDuration(retryIn)}.</p>
        )}
      </section>
    );
  }

  return null;
}
