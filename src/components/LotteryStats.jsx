import { useEffect, useRef, useState } from "react";
import { STATE } from "../config";
import { deVille, formatDate, formatDuration, formatEth, formatEur } from "../lib/format";
import { useCountUp } from "../hooks/useCountUp";

const MAX_SEATS = 30; // au-delà, les places s'affichent en barre plutôt qu'en ampoules

/** « +0,003 ETH » qui s'envole de la cagnotte à chaque achat (même loterie uniquement). */
function usePotGains(pot, roundId) {
  const [gains, setGains] = useState([]);
  const previous = useRef(null);
  useEffect(() => {
    if (pot === undefined || pot === null) return;
    const before = previous.current;
    previous.current = { pot, roundId };
    if (!before || before.roundId !== roundId || pot <= before.pot) return;
    const gain = { id: `${roundId}-${pot}`, amount: pot - before.pot };
    setGains((list) => [...list, gain]);
    const timer = setTimeout(() => setGains((list) => list.filter((g) => g.id !== gain.id)), 1800);
    return () => clearTimeout(timer);
  }, [pot, roundId]);
  return gains;
}

/** Ce qu'indiquent l'en-tête, la case « temps » et la phrase sous la cagnotte, selon l'état de la loterie. */
function describe(data, now, cityName) {
  const secondsLeft = data.endTime - now;
  if (data.roundId === 0n) {
    return { status: "Bientôt", time: "—", timeLabel: "Ouverture", sub: `La mairie prépare la première loterie ${deVille(cityName)}.` };
  }
  if (data.state === STATE.CALCULATING) {
    return { status: "Tirage en cours", time: "…", timeLabel: "Tirage", sub: "Chainlink tire le gagnant au sort." };
  }
  if (data.state === STATE.CLOSED) {
    return { status: "Terminée", time: "Fin", timeLabel: "Vente", sub: "La prochaine loterie sera annoncée ici." };
  }
  if (!data.canDraw && secondsLeft > 0) {
    return { status: `Fin le ${formatDate(data.endTime)}`, time: formatDuration(secondsLeft), timeLabel: "Fin dans", sub: "Toute la cagnotte est reversée au gagnant." };
  }
  return {
    status: "Vente terminée",
    time: "0:00",
    timeLabel: "Fin dans",
    sub:
      data.tickets.length === 0
        ? "Aucun ticket vendu : la loterie sera clôturée sans gagnant."
        : "La vente est terminée : la mairie va lancer le tirage.",
  };
}

/**
 * Récapitulatif de la loterie, présenté comme un ticket de tombola :
 * la cagnotte, trois chiffres clés, le remplissage des places et, sur le talon, le prix du ticket.
 */
export function LotteryStats({ data, now, cityName }) {
  const pot = useCountUp(data?.pot);
  const gains = usePotGains(data?.pot, data?.roundId);
  if (!data) {
    return (
      <section className="lottery-card is-loading" aria-busy="true" aria-label="Chargement de la loterie">
        <div className="lottery-body">
          <p className="pot-label">Chargement…</p>
          <div className="skeleton skeleton-big" />
          <div className="skeleton" />
        </div>
      </section>
    );
  }

  const participants = Number(data.participantsCount);
  const maxParticipants = Number(data.maxParticipants);
  const progress = maxParticipants > 0 ? Math.min(100, (participants / maxParticipants) * 100) : 0;
  const connected = Boolean(data.me);
  const myTickets = Number(data.me?.myTickets ?? 0n);
  const sold = data.tickets.length;
  const { status, time, timeLabel, sub } = describe(data, now, cityName);
  // Pendant la vente, les ampoules autour du ticket clignotent
  const live = data.state === STATE.OPEN && !data.canDraw && data.endTime > now;

  return (
    <section className={`lottery-card${live ? " is-live" : ""}`} aria-labelledby="pot-title">
      <div className="lottery-head">
        <span className="lottery-number">{data.roundId === 0n ? "Loterie" : `Loterie n° ${data.roundId}`}</span>
        <span>{status}</span>
      </div>

      <div className="lottery-body">
        <h2 id="pot-title" className="pot-label">
          Cagnotte
        </h2>
        {/* Le chiffre défile à l'écran ; les lecteurs d'écran n'entendent que le montant final. */}
        <div className="pot-wrap">
          <p className={`pot-amount${pot.bumped ? " is-bumped" : ""}`} aria-hidden="true">
            {formatEth(pot.shown, { withUnit: false })}
            <small>ETH</small>
          </p>
          {formatEur(data.pot) && <p className="pot-sub">{formatEur(data.pot)}</p>}
          {gains.map((gain) => (
            <span key={gain.id} className="pot-gain" aria-hidden="true">
              +{formatEth(gain.amount, { eur: false })}
            </span>
          ))}
        </div>
        <p className="visually-hidden" aria-live="polite">
          {formatEth(data.pot)}
        </p>
        <p className="pot-sub">{sub}</p>

        {data.roundId > 0n && (
          <>
            <dl className="facts">
              <div className="fact">
                <dt>Participants</dt>
                <dd>{participants}</dd>
              </div>
              <div className="fact">
                <dt>{timeLabel}</dt>
                {/* Compte à rebours en tuiles, comme un panneau d'affichage */}
                <dd aria-live="off" aria-label={time} className={/^[\d:]+$/.test(time) ? "flip" : undefined}>
                  {/^[\d:]+$/.test(time)
                    ? [...time].map((char, i) => (
                        <span key={i} aria-hidden="true" className={char === ":" ? "flip-sep" : "flip-tile"}>
                          {char}
                        </span>
                      ))
                    : time}
                </dd>
              </div>
              <div className="fact">
                <dt>{connected ? "Mes tickets" : "Tickets vendus"}</dt>
                <dd>{connected ? myTickets : sold}</dd>
              </div>
            </dl>

            <div className="progress">
              <p className="progress-label">
                <span>Places occupées</span>
                <b>
                  {participants} sur {maxParticipants}
                </b>
              </p>
              {maxParticipants <= MAX_SEATS ? (
                // Peu de places : une ampoule par place, qui s'allume quand quelqu'un la prend
                <div
                  className="seats"
                  role="progressbar"
                  aria-label="Places occupées"
                  aria-valuemin={0}
                  aria-valuemax={maxParticipants}
                  aria-valuenow={participants}
                >
                  {Array.from({ length: maxParticipants }, (_, i) => (
                    <span key={i} className={i < participants ? "is-on" : undefined} />
                  ))}
                </div>
              ) : (
                <div
                  className="progress-track"
                  role="progressbar"
                  aria-label="Places occupées"
                  aria-valuemin={0}
                  aria-valuemax={maxParticipants}
                  aria-valuenow={participants}
                >
                  <div className="progress-bar" style={{ width: `${progress}%` }} />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {data.roundId > 0n && (
        <div className="lottery-stub">
          <span>Prix du ticket</span>
          <b>{formatEth(data.ticketPrice)}</b>
        </div>
      )}
    </section>
  );
}
