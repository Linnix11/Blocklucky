import { useRef } from "react";
import { sameAddress } from "../lib/format";
import { ticketLabel } from "../lib/drawProof";

/**
 * Les tickets de l'habitant, présentés comme des billets de tombola à talon.
 * Le numéro est la vraie position du ticket dans la liste du contrat (getTickets) : c'est ce numéro que le
 * tirage désigne. Un billet qui vient d'être acheté « sort » de la fente ; le billet gagnant est tamponné.
 */
export function MyTickets({ tickets, account, roundId, proof }) {
  const mine = [];
  tickets.forEach((address, index) => sameAddress(address, account) && mine.push(index));

  // Billets déjà là au premier affichage (pour ce compte et cette loterie) : eux ne s'animent pas.
  // Les autres gardent leur classe « is-new » : l'animation ne se joue qu'une fois, et les rafraîchissements
  // de la page (horloge, sondage du contrat) ne la coupent plus en cours de route.
  const owner = `${account}-${roundId}`;
  const initialRef = useRef(null);
  if (initialRef.current?.owner !== owner) initialRef.current = { owner, indexes: new Set(mine) };
  const initial = initialRef.current.indexes;
  const fresh = mine.filter((index) => !initial.has(index));

  if (mine.length === 0) return null;
  const winning = proof && proof.roundId === roundId && sameAddress(proof.computedWinner, account) ? proof.index : null;

  return (
    <ul className="stubs" aria-label="Mes tickets">
      {mine.map((index) => (
        <li
          key={index}
          className={`stub${initial.has(index) ? "" : " is-new"}${index === winning ? " is-winning" : ""}`}
          style={initial.has(index) ? undefined : { "--stub-delay": `${Math.min(fresh.indexOf(index), 5) * 120}ms` }}
        >
          <span className="stub-round">Loterie n° {String(roundId)}</span>
          <span className="stub-no">{ticketLabel(index, tickets.length)}</span>
          {index === winning && <span className="stub-stamp">Gagnant</span>}
        </li>
      ))}
    </ul>
  );
}
