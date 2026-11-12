import { STATE } from "../config";
import { formatDate, formatDuration, formatEth, sameAddress, shortAddress } from "../lib/format";

/**
 * Bandeau qui défile façon fronton de fête foraine, avec les infos de la loterie en cours.
 * Purement décoratif (aria-hidden) : les mêmes informations sont lisibles dans le ticket juste en dessous.
 */
export function Ticker({ data, now }) {
  if (!data || data.roundId === 0n) return null;
  const selling = data.state === STATE.OPEN && !data.canDraw && data.endTime > now;
  const left = Math.max(0, Number(data.maxParticipants) - Number(data.participantsCount));
  const items = [
    `Loterie n° ${data.roundId}`,
    `Cagnotte : ${formatEth(data.pot)}`,
    selling ? `Fin dans ${formatDuration(data.endTime - now)}` : data.state === STATE.CALCULATING ? "Tirage en cours" : "Vente terminée",
    selling ? `${left} place${left > 1 ? "s" : ""} libre${left > 1 ? "s" : ""}` : "Merci à tous les joueurs",
    "Tirage public et vérifiable",
    "Toute la cagnotte au gagnant",
    "Bonne chance !",
  ];
  // Deux copies à la suite : la bande boucle sans à-coup
  const row = (copy) => (
    <span className="ticker-row" key={copy}>
      {items.map((item, i) => (
        <span key={i} className="ticker-item">
          {item}
        </span>
      ))}
    </span>
  );
  return (
    <div className={`ticker${selling ? " is-live" : ""}`} aria-hidden="true">
      <div className="ticker-track">
        {row("a")}
        {row("b")}
      </div>
    </div>
  );
}

const TROPHIES = ["is-gold", "is-silver", "is-bronze"];

/** Tableau des derniers gagnants : les trois derniers tirages, le plus récent en tête. */
export function LastWinners({ data, account }) {
  const winners = data?.history?.slice(0, 3) ?? [];
  return (
    <section className="card last-winners" aria-labelledby="last-winners-title">
      <h2 id="last-winners-title">Derniers gagnants</h2>
      {winners.length === 0 ? (
        <p className="muted">Pas encore de gagnant : le premier sera peut-être vous.</p>
      ) : (
        <ol>
          {winners.map((result, i) => (
            <li key={String(result.roundId)} className={TROPHIES[i]}>
              <span className="trophy" aria-hidden="true">
                {i + 1}
              </span>
              <span className="last-winner-who">
                <b>{sameAddress(result.winner, account) ? "Vous !" : shortAddress(result.winner)}</b>
                <small>
                  Loterie n° {String(result.roundId)} · {formatDate(result.timestamp)}
                </small>
              </span>
              <span className="last-winner-prize">{formatEth(result.prize)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
