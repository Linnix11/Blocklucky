import { explorerLink, formatDate, formatEth, sameAddress, shortAddress } from "../lib/format";

function AddressLink({ network, address, account }) {
  const label = sameAddress(address, account) ? "vous" : shortAddress(address);
  const href = explorerLink(network.explorer, "address", address);
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" title={address}>
      {label}
    </a>
  ) : (
    <span title={address}>{label}</span>
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
export function Transparency({ data, derived, activity, network, deployment, account }) {
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
        <div className="panel">
          <h3>Le contrat</h3>
          <p className="mono-address">{deployment.BlockLucky}</p>
          {contractHref ? (
            <a className="btn btn-ghost" href={contractHref} target="_blank" rel="noreferrer">
              Voir le code et les transactions sur Etherscan
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
            Les {totalTickets} ticket{totalTickets > 1 ? "s" : ""} en jeu
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
