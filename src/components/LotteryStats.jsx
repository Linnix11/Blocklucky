import { STATE } from "../config";
import { deVille, formatDate, formatDuration, formatEth } from "../lib/format";

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

  return (
    <section className="lottery-card" aria-labelledby="pot-title">
      <div className="lottery-head">
        <span className="lottery-number">{data.roundId === 0n ? "Loterie" : `Loterie n° ${data.roundId}`}</span>
        <span>{status}</span>
      </div>

      <div className="lottery-body">
        <h2 id="pot-title" className="pot-label">
          Cagnotte
        </h2>
        <p className="pot-amount" aria-live="polite">
          {formatEth(data.pot, { withUnit: false })}
          <small>ETH</small>
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
                <dd aria-live="off">{time}</dd>
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
