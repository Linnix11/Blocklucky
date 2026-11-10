import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { explorerLink, formatDate, formatEth, sameAddress, shortAddress } from "../lib/format";

// Couleurs du design (tokens.css) : bleu, rouge du ticket, or doux. canvas-confetti ne lit pas les variables CSS.
const FESTIVE_COLORS = ["#1F4E8C", "#A3242F", "#E8B04B", "#E8EFF8"];

function celebrate() {
  const options = { colors: FESTIVE_COLORS, disableForReducedMotion: true, zIndex: 60 };
  confetti({ ...options, particleCount: 90, spread: 70, origin: { y: 0.35 } });
}

/** Annonce du gagnant en plein écran, avec confettis, quand le tirage vient d'avoir lieu. */
export function WinnerAnnouncement({ announcement, account, onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!announcement) return undefined;
    celebrate();
    closeRef.current?.focus();
    const onKey = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [announcement, onClose]);

  if (!announcement) return null;
  const isMe = sameAddress(account, announcement.winner);

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="winner-title">
      <div className="winner-card">
        <p className="winner-kicker">Loterie n° {String(announcement.roundId)}</p>
        <h2 id="winner-title" className="winner-title">
          {isMe ? "Vous avez gagné !" : "Nous avons un gagnant !"}
        </h2>
        <p className="winner-prize">{formatEth(announcement.prize)}</p>
        <p className="winner-address">
          {isMe ? "Les gains sont envoyés directement dans votre portefeuille." : <>pour le portefeuille {shortAddress(announcement.winner)}</>}
        </p>
        <button ref={closeRef} type="button" className="btn btn-primary" onClick={onClose}>
          Fermer
        </button>
      </div>
    </div>
  );
}

/** Dernier résultat et, si besoin, récupération des gains mis de côté. */
export function WinnerBanner({ data, account, network, txInProgress, onWithdraw }) {
  if (!data) return null;
  const pending = data.me?.pendingPrize ?? 0n;
  const last = data.history[0];
  const showLast = last && last.roundId === data.roundId && data.state === 0;

  return (
    <>
      {pending > 0n && (
        <section className="panel panel-prize" aria-labelledby="prize-title">
          <h2 id="prize-title">Vous avez des gains à récupérer</h2>
          <p>
            L'envoi automatique de vos {formatEth(pending)} n'a pas abouti. Ils vous sont réservés : vous seul pouvez
            les récupérer.
          </p>
          <button type="button" className="btn btn-primary btn-block btn-lg" onClick={onWithdraw} disabled={txInProgress}>
            Récupérer mes {formatEth(pending)}
          </button>
        </section>
      )}

      {showLast && (
        <section className="panel panel-result" aria-labelledby="result-title">
          <h2 id="result-title">Résultat de la loterie n° {String(last.roundId)}</h2>
          {last.winner === "0x0000000000000000000000000000000000000000" ? (
            <p>Aucun ticket n'a été vendu : la loterie s'est terminée sans gagnant.</p>
          ) : (
            <p>
              {sameAddress(account, last.winner) ? (
                <strong>Vous avez gagné {formatEth(last.prize)} !</strong>
              ) : (
                <>
                  Le portefeuille{" "}
                  {network.explorer ? (
                    <a href={explorerLink(network.explorer, "address", last.winner)} target="_blank" rel="noreferrer">
                      {shortAddress(last.winner)}
                    </a>
                  ) : (
                    <strong>{shortAddress(last.winner)}</strong>
                  )}{" "}
                  a remporté <strong>{formatEth(last.prize)}</strong>
                </>
              )}{" "}
              parmi {String(last.ticketsSold)} tickets, le {formatDate(last.timestamp)}.
            </p>
          )}
        </section>
      )}
    </>
  );
}
