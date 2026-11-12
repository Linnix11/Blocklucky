import { useEffect, useMemo, useState } from "react";
import { Contract, JsonRpcProvider, Network } from "ethers";
import { LOTTERY_ABI, STATE, TARGET, TARGET_CHAIN_ID } from "../config";
import { formatDuration, formatEth } from "../lib/format";
import { useNow } from "../hooks/useNow";
import { usePageTitle } from "../hooks/usePageTitle";

const REFRESH_MS = 30000;

/** Lit l'état de la loterie de chaque ville (lecture seule, sans portefeuille). */
function useCityStatuses(cities) {
  const provider = useMemo(
    () => new JsonRpcProvider(TARGET.rpcUrl, Network.from(TARGET_CHAIN_ID), { staticNetwork: true }),
    []
  );
  const [statuses, setStatuses] = useState({});

  useEffect(() => {
    if (!cities?.length) return undefined;
    let cancelled = false;
    const load = () =>
      Promise.all(
        cities.map(async (city) => {
          try {
            const c = new Contract(city.address, LOTTERY_ABI, provider);
            const [state, roundId, endTime, pot, canDraw, participants] = await Promise.all([
              c.state(),
              c.roundId(),
              c.endTime(),
              c.getPot(),
              c.canDraw(),
              c.participantsCount(),
            ]);
            return [city.id, { state: Number(state), roundId, endTime: Number(endTime), pot, canDraw, participants }];
          } catch {
            return [city.id, { error: true }];
          }
        })
      ).then((entries) => {
        if (!cancelled) setStatuses(Object.fromEntries(entries));
      });
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [cities, provider]);

  return statuses;
}

function describeStatus(status, now) {
  if (!status) return { label: "…", tone: "idle" };
  if (status.error) return { label: "État indisponible", tone: "idle" };
  if (status.roundId === 0n) return { label: "Pas encore de loterie", tone: "idle" };
  if (status.state === STATE.CALCULATING) return { label: "Tirage en cours", tone: "draw" };
  if (status.state === STATE.CLOSED) return { label: "Loterie terminée", tone: "idle" };
  if (status.canDraw || status.endTime <= now) {
    // Sans ticket vendu, la mairie clôture la loterie sans gagnant : pas de « tirage » à annoncer.
    return status.participants === 0n
      ? { label: "Vente terminée, aucun ticket vendu", tone: "idle" }
      : { label: "Vente terminée, tirage à venir", tone: "draw" };
  }
  return { label: `Vente ouverte · fin dans ${formatDuration(status.endTime - now)}`, tone: "open" };
}

/** Accueil : la liste des villes, avec l'état de leur loterie. */
export function HomePage({ cities }) {
  const statuses = useCityStatuses(cities);
  const now = useNow();
  usePageTitle();

  return (
    <main className="page">
      <div className="intro hero">
        <div className="hero-text">
          <p className="hero-kicker">Tombola des fêtes, version blockchain</p>
          <h1>
            La loterie de <span className="hl">votre ville</span>
          </h1>
          <p className="hero-lead">
            Chaque ville organise sa loterie. Le tirage au sort est public et vérifiable, et toute la cagnotte revient au gagnant.
          </p>
        </div>
        {/* Décor : trois billets de tombola qui flottent */}
        <div className="hero-deco" aria-hidden="true">
          <span className="deco-ticket deco-1">
            <b>N° 007</b>
            <i>BlockLucky</i>
          </span>
          <span className="deco-ticket deco-2">
            <b>N° 042</b>
            <i>Bonne chance</i>
          </span>
          <span className="deco-ticket deco-3">
            <b>N° 128</b>
            <i>Tirage public</i>
          </span>
          <span className="deco-ball deco-ball-1" />
          <span className="deco-ball deco-ball-2" />
          <span className="deco-ball deco-ball-3" />
        </div>
      </div>
      <h2 className="city-list-title">Choisissez votre ville</h2>
      {cities === null ? (
        <p className="muted">Chargement…</p>
      ) : cities.length === 0 ? (
        <p className="muted">Aucune ville n'a encore ouvert de loterie.</p>
      ) : (
        <>
          {cities.every((city) => statuses[city.id] && describeStatus(statuses[city.id], now).tone !== "open") && (
            <p className="notice">Aucune vente en cours pour l'instant. La prochaine loterie sera annoncée ici.</p>
          )}
          <ul className="city-list" aria-label="Villes">
            {cities.map((city) => {
              const status = statuses[city.id];
              const { label, tone } = describeStatus(status, now);
              const showPot = status && !status.error && status.roundId > 0n && status.state !== STATE.CLOSED;
              return (
                <li key={city.id}>
                  <a className={`city-row${tone === "open" ? " is-live" : ""}`} href={`/ville/${city.slug}`}>
                    <span className="city-name">{city.name}</span>
                    <span className={`city-status city-status-${tone}`}>{label}</span>
                    <span className="city-pot">{showPot ? formatEth(status.pot) : ""}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <section className="home-steps" aria-labelledby="home-steps-title">
        <h2 id="home-steps-title">Comment ça marche ?</h2>
        <ol>
          <li>
            <span className="home-step-token" aria-hidden="true">1</span>
            <strong>Je prends mes tickets</strong>
            <span>De 1 à 5 tickets, payés en ethers de test : aucun vrai argent.</span>
          </li>
          <li>
            <span className="home-step-token" aria-hidden="true">2</span>
            <strong>La cagnotte grimpe</strong>
            <span>Chaque achat s'affiche en direct, visible par tout le monde.</span>
          </li>
          <li>
            <span className="home-step-token" aria-hidden="true">3</span>
            <strong>Tirage public</strong>
            <span>Chainlink tire le gagnant au sort, qui empoche toute la cagnotte.</span>
          </li>
        </ol>
      </section>
    </main>
  );
}
