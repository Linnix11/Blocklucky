import { STATE } from "../config";
import { formatDuration, formatEth } from "../lib/format";

/**
 * Le billet de tombola : cagnotte, participants, prix du ticket et compte à rebours (sur le talon).
 */
export function LotteryStats({ data, now }) {
  if (!data) {
    return (
      <section className="ticket ticket-loading" aria-busy="true" aria-label="Chargement de la loterie">
        <div className="ticket-main">
          <p className="ticket-kicker">Chargement de la loterie…</p>
          <div className="skeleton skeleton-big" />
          <div className="skeleton" />
        </div>
        <div className="ticket-stub" />
      </section>
    );
  }

  const noRoundYet = data.roundId === 0n;
  const participants = Number(data.participantsCount);
  const maxParticipants = Number(data.maxParticipants);
  const progress = maxParticipants > 0 ? Math.min(100, (participants / maxParticipants) * 100) : 0;
  const secondsLeft = data.endTime - now;
  const saleOpen = data.state === STATE.OPEN && !data.canDraw && secondsLeft > 0;

  let stubTitle;
  let stubValue;
  if (noRoundYet) {
    stubTitle = "Bientôt";
    stubValue = "La mairie prépare la première loterie";
  } else if (data.state === STATE.CALCULATING) {
    stubTitle = "Tirage en cours";
    stubValue = "Chainlink tire au sort";
  } else if (data.state === STATE.CLOSED) {
    stubTitle = "Loterie terminée";
    stubValue = "Prochaine loterie bientôt";
  } else if (saleOpen) {
    stubTitle = "Fin de la vente dans";
    stubValue = formatDuration(secondsLeft);
  } else {
    stubTitle = "Vente terminée";
    stubValue = "Le tirage peut être lancé";
  }

  return (
    <section className="ticket" aria-labelledby="pot-title">
      <div className="ticket-main">
        <p className="ticket-kicker">
          {noRoundYet ? "Loterie des fêtes d'EtherBay" : `Loterie des fêtes n° ${data.roundId}`}
        </p>
        <h2 id="pot-title" className="pot-label">
          Cagnotte
        </h2>
        <p className="pot-amount" aria-live="polite">
          {formatEth(data.pot, { withUnit: false })}
          <span className="pot-unit">ETH</span>
        </p>
        <p className="pot-rule">100 % de la cagnotte pour le gagnant, tiré au sort de façon vérifiable.</p>

        {!noRoundYet && (
          <dl className="ticket-facts">
            <div className="fact fact-wide">
              <dt>Participants</dt>
              <dd>
                {participants} sur {maxParticipants}
                <span className="progress" aria-hidden="true">
                  <span className="progress-bar" style={{ width: `${progress}%` }} />
                </span>
              </dd>
            </div>
            <div className="fact">
              <dt>Tickets vendus</dt>
              <dd>{data.tickets.length}</dd>
            </div>
            <div className="fact">
              <dt>Prix du ticket</dt>
              <dd>{formatEth(data.ticketPrice)}</dd>
            </div>
          </dl>
        )}
      </div>

      <div className={`ticket-stub ${saleOpen ? "is-live" : ""}`}>
        <p className="stub-title">{stubTitle}</p>
        <p className={`stub-value ${saleOpen ? "is-clock" : ""}`} aria-live={saleOpen ? "off" : "polite"}>
          {stubValue}
        </p>
        {!noRoundYet && (
          <p className="stub-number" aria-hidden="true">
            N° {String(data.roundId).padStart(6, "0")}
          </p>
        )}
      </div>
    </section>
  );
}
