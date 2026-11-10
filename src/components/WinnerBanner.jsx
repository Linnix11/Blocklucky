import { useCallback, useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { explorerLink, formatDate, formatEth, sameAddress, shortAddress } from "../lib/format";
import { ticketLabel } from "../lib/drawProof";

/** Couleurs du design de la ville : canvas-confetti ne lit pas les variables CSS, on les lit ici. */
function themeColors() {
  const style = getComputedStyle(document.documentElement);
  return ["--color-primary", "--color-festive", "--color-primary-wash", "--color-line-strong"]
    .map((name) => style.getPropertyValue(name).trim())
    .filter(Boolean);
}

export function celebrate() {
  const options = { colors: themeColors(), disableForReducedMotion: true, zIndex: 60 };
  confetti({ ...options, particleCount: 90, spread: 70, origin: { y: 0.35 } });
}

const REEL_ROWS = 40; // lignes qui défilent avant de s'arrêter
const REEL_MS = 3400; // durée du défilement (garder en phase avec .reel-strip dans styles.css)
const PROOF_WAIT_MS = 2500; // attente maximale de la preuve avant de lancer le tambour sans numéros

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Bande du tambour : des tickets réellement en jeu, pris au hasard pour l'effet visuel, puis le ticket gagnant
 * (avant-dernière ligne, pour qu'il s'arrête au centre de la fenêtre).
 * Avec la preuve (winnerIndex connu), chaque ligne porte son vrai numéro de ticket ; sinon, l'adresse seule.
 * Le résultat vient toujours du contrat : la bande ne fait que le mettre en scène.
 */
function buildReel(tickets, winnerIndex, winner) {
  const all = tickets?.length ? tickets.map((address, index) => ({ address, index: winnerIndex === null ? null : index })) : [];
  const pool = all.length ? all : [{ address: winner, index: null }];
  const others = pool.filter((row) => !sameAddress(row.address, winner));
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  // Deux lignes qui se suivent ne montrent jamais la même adresse, quand c'est possible : la bande « tourne ».
  const rows = [];
  for (let i = 0; i < REEL_ROWS; i++) {
    const choices = pool.filter((row) => !sameAddress(row.address, rows[i - 1]?.address));
    rows.push(pick(choices.length ? choices : pool));
  }
  // Juste avant et juste après le gagnant : un autre joueur, pour que l'arrêt se lise clairement.
  if (others.length) rows[rows.length - 1] = pick(others);
  rows.push({ address: winner, index: winnerIndex }, pick(others.length ? others : pool));
  return rows;
}

/**
 * Déroulé de l'annonce : attente de la preuve → défilement → arrêt sur le gagnant → résultat.
 * Si l'utilisateur demande moins d'animations, le résultat s'affiche directement.
 */
export function useDrawReveal(announcement, proof, tickets) {
  const [phase, setPhase] = useState("idle"); // idle → waiting → rolling → landed → done (ou timeout → rolling)
  const [reel, setReel] = useState(null);
  const ready = announcement && proof && proof.roundId === announcement.roundId ? proof : null;

  useEffect(() => {
    setReel(null);
    if (!announcement) return setPhase("idle");
    if (prefersReducedMotion()) return setPhase("done");
    setPhase("waiting");
    const timer = setTimeout(() => setPhase((p) => (p === "waiting" ? "timeout" : p)), PROOF_WAIT_MS);
    return () => clearTimeout(timer);
  }, [announcement]);

  useEffect(() => {
    if (!((phase === "waiting" && ready) || phase === "timeout")) return;
    // La bande est figée ici : les rafraîchissements suivants ne la relancent pas.
    const rows = buildReel(ready?.tickets ?? tickets, ready ? ready.index : null, announcement.winner);
    if (rows.length < 3) return setPhase("done");
    setReel(rows);
    setPhase("rolling");
  }, [phase, ready, tickets, announcement]);

  useEffect(() => {
    if (phase === "rolling") {
      // Deux images : la bande est d'abord posée en haut, puis la transition CSS la fait défiler.
      let frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => setPhase("landed"));
      });
      return () => cancelAnimationFrame(frame);
    }
    if (phase === "landed") {
      const timer = setTimeout(() => setPhase("done"), REEL_MS + 350);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [phase]);

  const skip = useCallback(() => setPhase("done"), []);
  return { phase, reel, skip, proof: ready };
}

/** Fenêtre du tambour (aussi utilisée en grand sur l'écran de projection). */
export function DrawReel({ reel, phase, account, total, className = "" }) {
  if (!reel) return <div className={`reel ${className}`} aria-hidden="true" />;
  const winnerRow = reel.length - 2;
  const moving = phase !== "rolling";
  return (
    <div className={`reel ${className}${moving ? " is-landed" : ""}`} aria-hidden="true">
      <ol className="reel-strip" style={{ "--reel-offset": moving ? winnerRow - 1 : 0, "--reel-ms": `${REEL_MS}ms` }}>
        {reel.map((row, i) => (
          <li key={i} className={i === winnerRow && moving ? "is-winner" : undefined}>
            {row.index !== null && <span className="reel-no">{ticketLabel(row.index, total)}</span>}
            <span className="reel-address">{shortAddress(row.address)}</span>
            {sameAddress(row.address, account) && <span className="reel-me">vous</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Annonce du gagnant en plein écran : le tambour de la tombola tourne, s'arrête sur le gagnant, puis confettis. */
export function WinnerAnnouncement({ announcement, proof, tickets, account, onClose }) {
  const closeRef = useRef(null);
  const { phase, reel, skip, proof: matched } = useDrawReveal(announcement, proof, tickets);

  useEffect(() => {
    if (!announcement) return undefined;
    const onKey = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [announcement, onClose]);

  useEffect(() => {
    if (phase !== "done") return;
    celebrate();
    closeRef.current?.focus();
  }, [phase]);

  if (!announcement) return null;
  const isMe = sameAddress(account, announcement.winner);
  const revealed = phase === "done";
  const total = matched?.ticketCount ?? tickets?.length ?? 0;

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="winner-title">
      <div className={`winner-card${revealed ? " is-revealed" : ""}`}>
        <p className="winner-kicker">Loterie n° {String(announcement.roundId)}</p>

        {(reel || phase === "waiting") && <DrawReel reel={reel} phase={phase} account={account} total={total} />}

        {revealed ? (
          <>
            <h2 id="winner-title" className="winner-title">
              {isMe ? "Vous avez gagné !" : "Nous avons un gagnant !"}
            </h2>
            <p className="winner-prize">{formatEth(announcement.prize)}</p>
            <p className="winner-address">
              {matched && <>Ticket {ticketLabel(matched.index, total)}, </>}
              {isMe ? "les gains sont envoyés directement dans votre portefeuille." : <>portefeuille {shortAddress(announcement.winner)}</>}
            </p>
            <button ref={closeRef} type="button" className="btn btn-primary" onClick={onClose}>
              Fermer
            </button>
          </>
        ) : (
          <>
            <h2 id="winner-title" className="winner-title" aria-live="polite">
              Tirage au sort…
            </h2>
            <p className="winner-address">Parmi les {total} tickets en jeu</p>
            <button type="button" className="btn btn-ghost" onClick={skip}>
              Voir le résultat
            </button>
          </>
        )}
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
