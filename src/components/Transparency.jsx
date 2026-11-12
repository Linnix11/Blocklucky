import { explorerLink, formatDate, formatEth, sameAddress, shortAddress } from "../lib/format";
import { ticketLabel } from "../lib/drawProof";

/** Grand nombre lisible : « 0x1f3a…9c2e » (le nombre entier reste dans l'infobulle). */
function shortHex(value) {
  const hex = `0x${value.toString(16).padStart(64, "0")}`;
  return <span title={hex}>{`${hex.slice(0, 8)}…${hex.slice(-6)}`}</span>;
}

/**
 * Le calcul du tirage, refait par le navigateur du visiteur à partir des données publiques (lib/drawProof.js).
 * Chaque étape renvoie à ce que chacun peut contrôler sur Etherscan.
 */
function DrawCheck({ proof, network, account }) {
  const label = ticketLabel(proof.index, proof.ticketCount);
  const proofHref = explorerLink(network.explorer, "tx", proof.fulfillTx);
  return (
    <div className="panel panel-check">
      {/* Tampon décoratif : le verdict écrit reste plus bas (role="status") */}
      {proof.matches && (
        <span className="stamp" aria-hidden="true">
          Vérifié
        </span>
      )}
      <h3>Vérifier le tirage n° {String(proof.roundId)}</h3>
      <ol className="check-steps">
        <li>
          <span className="check-label">Graine publiée par Chainlink</span>
          <code>{shortHex(proof.seed)}</code>
          {proofHref && (
            <a href={proofHref} target="_blank" rel="noreferrer" className="activity-link">
              preuve
            </a>
          )}
        </li>
        <li>
          <span className="check-label">Nombre livré au contrat</span>
          <code>keccak256(graine, 0) = {shortHex(proof.word)}</code>
        </li>
        <li>
          <span className="check-label">Reste de la division par {proof.ticketCount} tickets</span>
          <code>
            {String(proof.index)} → ticket {label}
          </code>
        </li>
        <li>
          <span className="check-label">Ticket {label}</span>
          <code>
            <AddressLink network={network} address={proof.computedWinner} account={account} />
          </code>
        </li>
      </ol>
      <p className={`check-verdict${proof.matches ? " is-ok" : " is-ko"}`} role="status">
        {proof.matches
          ? "C'est bien le gagnant enregistré par le contrat."
          : "Attention : ce calcul ne correspond pas au gagnant enregistré."}
      </p>
      <p className="hint">Votre navigateur vient de refaire ce calcul lui-même, à partir des données publiques de la blockchain.</p>
    </div>
  );
}

/** Jeton de couleur propre à chaque portefeuille (teinte tirée de l'adresse), pour reconnaître les joueurs d'un coup d'œil. */
function Avatar({ address }) {
  let hue = 0;
  for (const char of String(address).toLowerCase()) hue = (hue * 31 + char.charCodeAt(0)) % 360;
  return <span className="avatar" style={{ "--hue": hue }} aria-hidden="true" />;
}

function AddressLink({ network, address, account }) {
  const label = sameAddress(address, account) ? "vous" : shortAddress(address);
  const href = explorerLink(network.explorer, "address", address);
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" title={address} className="who">
      <Avatar address={address} />
      {label}
    </a>
  ) : (
    <span title={address} className="who">
      <Avatar address={address} />
      {label}
    </span>
  );
}

function describe(event, network, account) {
  const who = (address) => <AddressLink network={network} address={address} account={account} />;
  switch (event.name) {
    case "RoundStarted":
      return <>La loterie n° {String(event.args[0])} est ouverte.</>;
    case "TicketsPurchased":
      return (
        <>
          {who(event.args[1])} a acheté {String(event.args[2])} ticket{event.args[2] > 1n ? "s" : ""}. Cagnotte :{" "}
          {formatEth(event.args[3])}.
        </>
      );
    case "DrawRequested":
      return <>Tirage demandé à Chainlink pour la loterie n° {String(event.args[0])}.</>;
    case "WinnerPicked":
      return (
        <>
          {who(event.args[1])} remporte {formatEth(event.args[2])} (loterie n° {String(event.args[0])}).
        </>
      );
    case "PrizeCredited":
      return <>Gains mis de côté pour {who(event.args[0])} : {formatEth(event.args[1])}.</>;
    case "PrizeWithdrawn":
      return <>{who(event.args[0])} a récupéré {formatEth(event.args[1])}.</>;
    case "RoundClosedWithoutWinner":
      return <>La loterie n° {String(event.args[0])} s'est terminée sans ticket vendu.</>;
    case "OwnershipTransferred":
      return <>Le contrat a été mis en service et confié à {who(event.args[1])}.</>;
    case "OwnershipTransferRequested":
      return <>Transfert de la gestion du contrat demandé vers {who(event.args[1])}.</>;
    default:
      return event.name;
  }
}

/** Tout ce qui permet de vérifier la loterie : contrat, tickets, journal en direct, historique. */
export function Transparency({ data, derived, activity, network, deployment, account, proof }) {
  if (!data || !deployment) return null;
  const contractHref = explorerLink(network.explorer, "address", deployment.BlockLucky);
  const totalTickets = data.tickets.length;

  return (
    <section className="transparency" aria-labelledby="transparency-title">
      <h2 id="transparency-title">Transparence</h2>
      <p className="lead">
        Tout se passe dans un programme public sur la blockchain : chacun peut vérifier les tickets, le tirage et le
        paiement. Personne, pas même la mairie, ne peut modifier les règles en cours de route.
      </p>

      <div className="transparency-grid">
        {proof && <DrawCheck proof={proof} network={network} account={account} />}

        <div className="panel">
          <h3>Le contrat</h3>
          <p className="mono-address">{deployment.BlockLucky}</p>
          {contractHref ? (
            <a className="btn btn-ghost" href={contractHref} target="_blank" rel="noreferrer">
              Voir sur Etherscan
            </a>
          ) : (
            <p className="hint">Réseau local : pas d'explorateur public.</p>
          )}
          <p className="hint">
            Le hasard vient de Chainlink VRF : un nombre aléatoire livré avec une preuve mathématique qu'il n'a pas
            été choisi.
          </p>
        </div>

        <div className="panel">
          <h3>
            {totalTickets === 0
              ? "Aucun ticket en jeu"
              : `${totalTickets === 1 ? "Le ticket" : `Les ${totalTickets} tickets`} en jeu`}
          </h3>
          {derived.players.length === 0 ? (
            <p className="muted">Aucun ticket pour l'instant. Le premier achat apparaîtra ici.</p>
          ) : (
            <ul className="players">
              {derived.players.map((player) => (
                <li key={player.address} className={sameAddress(player.address, account) ? "is-me" : ""}>
                  <AddressLink network={network} address={player.address} account={account} />
                  <span className="players-bar" aria-hidden="true">
                    <span style={{ width: `${(player.count / totalTickets) * 100}%` }} />
                  </span>
                  <span className="players-count">
                    {player.count} ({((player.count / totalTickets) * 100).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} %)
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel">
          <h3>En direct</h3>
          {activity.length === 0 ? (
            <p className="muted">Les achats et les tirages s'afficheront ici dès qu'ils ont lieu.</p>
          ) : (
            <ul className="activity" aria-live="polite">
              {activity.map((event) => (
                <li key={event.id}>
                  {describe(event, network, account)}
                  {network.explorer && (
                    <>
                      {" "}
                      <a href={explorerLink(network.explorer, "tx", event.txHash)} target="_blank" rel="noreferrer" className="activity-link">
                        preuve
                      </a>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel">
          <h3>Historique des tirages</h3>
          {data.history.length === 0 ? (
            <p className="muted">Aucun tirage pour l'instant.</p>
          ) : (
            <table className="history">
              <thead>
                <tr>
                  <th scope="col">N°</th>
                  <th scope="col">Gagnant</th>
                  <th scope="col">Gain</th>
                  <th scope="col">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.history.map((round) => (
                  <tr key={String(round.roundId)}>
                    <td>{String(round.roundId)}</td>
                    <td>
                      {round.winner === "0x0000000000000000000000000000000000000000" ? (
                        "Aucun"
                      ) : (
                        <AddressLink network={network} address={round.winner} account={account} />
                      )}
                    </td>
                    <td>{formatEth(round.prize)}</td>
                    <td>{formatDate(round.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}
