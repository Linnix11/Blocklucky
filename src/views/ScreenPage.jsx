import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { STATE } from "../config";
import { useBlockLucky } from "../hooks/useBlockLucky";
import { useCountUp } from "../hooks/useCountUp";
import { useNow } from "../hooks/useNow";
import { usePageTitle } from "../hooks/usePageTitle";
import { deVille, formatDuration, formatEth, shortAddress } from "../lib/format";
import { ticketLabel } from "../lib/drawProof";
import { DrawReel, celebrate, useDrawReveal } from "../components/WinnerBanner";
import { cityDeployment, useCityTheme } from "./CityPage";

/**
 * QR code de la page de la ville. Toujours noir sur blanc, quel que soit le design : c'est la forme que tous les
 * téléphones lisent (un thème sombre donnerait un QR inversé, souvent illisible).
 */
function useQrCode(url) {
  const [svg, setSvg] = useState(null);
  useEffect(() => {
    if (!url) return;
    QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } })
      .then(setSvg)
      .catch(() => setSvg(null));
  }, [url]);
  return svg;
}

/** Ligne du direct, en phrase courte lisible de loin. */
function describe(event) {
  switch (event.name) {
    case "TicketsPurchased": {
      const n = Number(event.args[2]);
      return `${shortAddress(event.args[1])} prend ${n} ticket${n > 1 ? "s" : ""}`;
    }
    case "RoundStarted":
      return `La loterie n° ${event.args[0]} est ouverte`;
    case "DrawRequested":
      return "Tirage demandé à Chainlink";
    case "WinnerPicked":
      return `${shortAddress(event.args[1])} remporte ${formatEth(event.args[2])}`;
    default:
      return null;
  }
}

/**
 * Écran de projection pour la place des fêtes : la cagnotte en très grand, le compte à rebours, un QR code
 * pour participer et le direct. Au tirage, le tambour occupe tout l'écran jusqu'à l'ouverture de la loterie suivante.
 * Lecture seule : aucun portefeuille, aucune action.
 */
export function ScreenPage({ city }) {
  const deployment = useMemo(() => cityDeployment(city), [city]);
  const lottery = useBlockLucky(deployment);
  const { data, activity, proof } = lottery;
  const now = useNow();
  const pot = useCountUp(data?.pot);
  const url = typeof window !== "undefined" ? `${window.location.origin}/ville/${city.slug}` : "";
  const qr = useQrCode(url);
  const [fullscreen, setFullscreen] = useState(false);
  usePageTitle(`Grand écran, loterie ${deVille(city.name)}`);
  useCityTheme(city.theme, city.customTheme);

  // Plein cadre : l'en-tête et le pied de page du site sont masqués sur cette page.
  useEffect(() => {
    document.body.classList.add("screen-mode");
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => {
      document.body.classList.remove("screen-mode");
      document.removeEventListener("fullscreenchange", onChange);
    };
  }, []);

  const reveal = useDrawReveal(lottery.announcement, proof, data?.tickets);
  useEffect(() => {
    if (reveal.phase === "done") celebrate();
  }, [reveal.phase]);
  // Le résultat reste affiché jusqu'à l'ouverture de la loterie suivante.
  useEffect(() => {
    if (lottery.announcement && data && data.roundId > lottery.announcement.roundId) lottery.dismissAnnouncement();
  }, [data, lottery]);

  const feed = activity.map((event) => ({ id: event.id, text: describe(event) })).filter((e) => e.text).slice(0, 6);
  const announcement = lottery.announcement;

  if (!data) return <main className="screen" aria-busy="true" />;

  const participants = Number(data.participantsCount);
  const maxParticipants = Number(data.maxParticipants);
  const selling = data.state === STATE.OPEN && !data.canDraw && data.endTime > now;
  const status =
    data.roundId === 0n
      ? "Bientôt"
      : data.state === STATE.CALCULATING
        ? "Tirage en cours"
        : selling
          ? "Vente ouverte"
          : data.state === STATE.OPEN
            ? "Vente terminée"
            : "Terminée";

  return (
    <main className="screen">
      <header className="screen-head">
        <p className="screen-kicker">
          {data.roundId > 0n ? `Loterie n° ${data.roundId}` : "Loterie"} {deVille(city.name)}
        </p>
        <p className={`screen-status${selling ? " is-live" : ""}`}>{status}</p>
        {!fullscreen && (
          <button type="button" className="btn btn-ghost screen-fs" onClick={() => document.documentElement.requestFullscreen?.()}>
            Plein écran
          </button>
        )}
      </header>

      <section className="screen-main">
        <div className="screen-pot">
          <p className="screen-label">Cagnotte</p>
          <p className={`screen-amount${pot.bumped ? " is-bumped" : ""}`}>
            {formatEth(pot.shown, { withUnit: false })}
            <small>ETH</small>
          </p>
          <p className="screen-sub">Toute la cagnotte va au gagnant. Ethers fictifs, aucun vrai argent.</p>

          {data.roundId > 0n && (
            <dl className="screen-facts">
              <div>
                <dt>Participants</dt>
                <dd>
                  {participants}
                  <small> / {maxParticipants}</small>
                </dd>
              </div>
              <div>
                <dt>Fin dans</dt>
                <dd>{selling ? formatDuration(data.endTime - now) : "0:00"}</dd>
              </div>
              <div>
                <dt>Tickets</dt>
                <dd>{data.tickets.length}</dd>
              </div>
            </dl>
          )}
          {data.roundId > 0n && (
            <div className="screen-lamps" aria-hidden="true">
              {Array.from({ length: Math.min(maxParticipants, 40) }, (_, i) => (
                <span key={i} className={i < participants ? "is-on" : undefined} />
              ))}
            </div>
          )}
        </div>

        <aside className="screen-side">
          <div className="screen-qr">
            {qr ? <div className="screen-qr-code" dangerouslySetInnerHTML={{ __html: qr }} /> : <div className="screen-qr-code" />}
            <div>
              <p className="screen-qr-title">Participez</p>
              <p className="screen-qr-url">{url.replace(/^https?:\/\//, "")}</p>
            </div>
          </div>
          <div className="screen-feed">
            <p className="screen-label">En direct</p>
            {feed.length === 0 ? (
              <p className="screen-muted">Les achats s'afficheront ici.</p>
            ) : (
              <ul>
                {feed.map((item) => (
                  <li key={item.id}>{item.text}</li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </section>

      {announcement && (
        <div className="screen-draw" role="dialog" aria-modal="true" aria-labelledby="screen-draw-title">
          <p className="screen-kicker">Tirage de la loterie n° {String(announcement.roundId)}</p>
          {(reveal.reel || reveal.phase === "waiting") && (
            <DrawReel reel={reveal.reel} phase={reveal.phase} total={reveal.proof?.ticketCount ?? data.tickets.length} className="reel-xl" />
          )}
          {reveal.phase === "done" ? (
            <div className="screen-result">
              <h2 id="screen-draw-title">{formatEth(announcement.prize)}</h2>
              <p>
                {reveal.proof && <>Ticket {ticketLabel(reveal.proof.index, reveal.proof.ticketCount)} · </>}
                portefeuille {shortAddress(announcement.winner)}
              </p>
            </div>
          ) : (
            <h2 id="screen-draw-title" className="screen-rolling">
              Tirage au sort…
            </h2>
          )}
        </div>
      )}
    </main>
  );
}
