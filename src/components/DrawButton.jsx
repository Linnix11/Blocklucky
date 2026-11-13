import { formatDuration } from "../lib/format";

/** Tambour de loterie animé (décoratif) : des boules tournent pendant que Chainlink calcule. */
function Drum() {
  return (
    <div className="drum" aria-hidden="true">
      <div className="drum-wheel">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className="drum-ball" style={{ "--i": i }} />
        ))}
      </div>
    </div>
  );
}

/**
 * Tirage, sur la page publique : le contrat permet à n'importe qui de le lancer une fois la vente finie,
 * et de le relancer si Chainlink n'a pas répondu après DRAW_TIMEOUT. La mairie n'a aucun rôle particulier ici.
 */
export function DrawButton({ data, derived, now, wallet, network, txInProgress, onDraw, onRetry, onConnect, onSimulate }) {
  if (!data || !derived) return null;

  // Bouton d'action commun : demande d'abord le portefeuille, puis le bon réseau.
  const action = (label, onClick, className = "btn-strong") => {
    if (!wallet.available) return null;
    if (!wallet.account) {
      return (
        <button type="button" className="btn btn-ghost btn-block" onClick={onConnect}>
          Connecter mon portefeuille
        </button>
      );
    }
    if (wallet.wrongNetwork) return <p className="hint">Passez votre portefeuille sur {network.shortName} pour continuer.</p>;
    return (
      <button type="button" className={`btn ${className} btn-block btn-lg draw-cta`} onClick={onClick} disabled={txInProgress}>
        {label}
      </button>
    );
  };

  if (data.canDraw && data.tickets.length === 0) {
    return (
      <section className="panel panel-draw reveal" aria-labelledby="draw-title">
        <h2 id="draw-title">La vente est terminée</h2>
        <p>
          Aucun ticket n'a été vendu. N'importe qui peut clôturer cette loterie, sans gagnant, pour qu'une nouvelle puisse ouvrir.
        </p>
        {action("Clôturer la loterie", onDraw, "btn-ghost")}
      </section>
    );
  }

  if (data.canDraw) {
    return (
      <section className="panel panel-draw panel-draw-ready reveal" aria-labelledby="draw-title">
        <h2 id="draw-title">C'est l'heure du tirage !</h2>
        <p>
          La vente est terminée. <strong>N'importe qui peut lancer le tirage</strong>, vous compris. Le gagnant est choisi par
          Chainlink, un service de hasard vérifiable : personne, pas même la mairie, ne peut influencer le résultat.
        </p>
        {action("Lancer le tirage", onDraw)}
        {wallet.account && !wallet.wrongNetwork && (
          <p className="hint center">Seuls les frais de réseau sont à payer, en ethers de test.</p>
        )}
      </section>
    );
  }

  if (derived.isCalculating) {
    const retryIn = derived.retryAvailableAt - now;
    return (
      <section className="panel panel-draw panel-drawing reveal" aria-labelledby="draw-title" aria-live="polite">
        <Drum />
        <h2 id="draw-title">Tirage en cours</h2>
        <p>
          Chainlink calcule un nombre aléatoire et la preuve qu'il n'a pas été truqué. Cela prend en général une à trois minutes.
          Le gagnant s'affichera ici automatiquement.
        </p>
        {network.chainId === 31337 && wallet.account && (
          <button type="button" className="btn btn-ghost btn-block" onClick={onSimulate} disabled={txInProgress}>
            Faire répondre Chainlink (réseau local)
          </button>
        )}
        {retryIn > 0 ? (
          <p className="hint">Sans réponse, n'importe qui pourra relancer le tirage dans {formatDuration(retryIn)}.</p>
        ) : (
          <>
            <p className="hint">Chainlink n'a pas répondu à temps : n'importe qui peut relancer le tirage.</p>
            {action("Relancer le tirage", onRetry)}
          </>
        )}
      </section>
    );
  }

  return null;
}
