import { STATE } from "../config";
import { deVille, formatDuration, formatEth } from "../lib/format";

const MAX_LAMPS = 20;

/** Un rouleau de la machine. La clé change avec la valeur : le rouleau « tourne » à chaque nouveau chiffre. */
function Reel({ value, label }) {
  return (
    <div className="reel">
      <span key={value} className="reel-value">
        {value}
      </span>
      <span className="reel-label">{label}</span>
    </div>
  );
}

/** Ce que dit le deuxième rouleau et la phrase sous la cagnotte, selon l'état de la loterie. */
function describe(data, now, cityName) {
  const secondsLeft = data.endTime - now;
  if (data.roundId === 0n) {
    return { clock: "—", clockLabel: "pas encore ouverte", sub: `La mairie prépare la première loterie ${deVille(cityName)}.` };
  }
  if (data.state === STATE.CALCULATING) {
    return { clock: "…", clockLabel: "tirage en cours", sub: "Chainlink tire le gagnant au sort." };
  }
  if (data.state === STATE.CLOSED) {
    return { clock: "FIN", clockLabel: "loterie terminée", sub: "La prochaine loterie sera annoncée ici." };
  }
  if (!data.canDraw && secondsLeft > 0) {
    return { clock: formatDuration(secondsLeft), clockLabel: "avant la fin", sub: "à gagner · toute la cagnotte pour le gagnant", live: true };
  }
  return data.tickets.length === 0
    ? { clock: "0:00", clockLabel: "vente terminée", sub: "Aucun ticket vendu : la loterie sera clôturée sans gagnant." }
    : { clock: "0:00", clockLabel: "vente terminée", sub: "Vente terminée : la mairie va lancer le tirage." };
}

/**
 * La machine à sous : cagnotte (jackpot), trois rouleaux (joueurs, temps, tickets), rampe de lampes et levier.
 * `pulling` abaisse le levier pendant un achat.
 */
export function LotteryStats({ data, now, cityName, pulling = false }) {
  if (!data) {
    return (
      <section className="cabinet is-loading" aria-busy="true" aria-label="Chargement de la loterie">
        <div className="machine">
          <p className="topper">Chargement…</p>
          <div className="skeleton skeleton-big" />
          <div className="skeleton" />
        </div>
      </section>
    );
  }

  const participants = Number(data.participantsCount);
  const maxParticipants = Number(data.maxParticipants);
  const lampCount = Math.min(MAX_LAMPS, Math.max(maxParticipants, 1));
  const lampsOn = maxParticipants > 0 ? Math.round((Math.min(participants, maxParticipants) / maxParticipants) * lampCount) : 0;
  const connected = Boolean(data.me);
  const myTickets = Number(data.me?.myTickets ?? 0n);
  const { clock, clockLabel, sub, live } = describe(data, now, cityName);

  return (
    <section className={`cabinet${pulling ? " is-pulling" : ""}`} aria-labelledby="pot-title">
      <div className="machine">
        <p className="topper">{data.roundId === 0n ? "Bientôt" : `★ Loterie n° ${data.roundId} ★`}</p>
        <h2 id="pot-title" className="visually-hidden">
          Cagnotte
        </h2>
        <p className="jackpot" aria-live="polite">
          {formatEth(data.pot, { withUnit: false })}
          <small>ETH</small>
        </p>
        <p className="jackpot-sub">{sub}</p>

        <div className="reels">
          <Reel value={participants} label={participants > 1 ? "joueurs" : "joueur"} />
          <div className={`reel${live ? " is-live" : ""}`} aria-live="off">
            <span className="reel-value">{clock}</span>
            <span className="reel-label">{clockLabel}</span>
          </div>
          {connected ? (
            <Reel value={myTickets} label={myTickets > 1 ? "mes tickets" : "mon ticket"} />
          ) : (
            <Reel value={data.tickets.length} label={data.tickets.length > 1 ? "tickets vendus" : "ticket vendu"} />
          )}
        </div>

        {data.roundId > 0n && (
          <div className="rail">
            <p>
              <span>Places</span>
              <b>
                {participants} {participants > 1 ? "joueurs" : "joueur"} sur {maxParticipants}
              </b>
            </p>
            <div className="lamps" aria-hidden="true">
              {Array.from({ length: lampCount }, (_, i) => (
                <i key={i} className={i < lampsOn ? "on" : undefined} />
              ))}
            </div>
            <p className="machine-price">
              <span>Prix du ticket</span>
              <b>{formatEth(data.ticketPrice)}</b>
            </p>
          </div>
        )}
      </div>
      <div className="lever" aria-hidden="true">
        <span className="lever-base" />
        <span className="lever-rod">
          <span className="lever-knob" />
        </span>
      </div>
    </section>
  );
}
