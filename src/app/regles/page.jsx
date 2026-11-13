export const metadata = { title: "Règles du tirage · BlockLucky" };

/**
 * Règles du tirage, telles qu'elles sont écrites dans le contrat BlockLucky.sol.
 * Si une règle du contrat change, mettre cette page à jour.
 */
export default function Page() {
  return (
    <main className="page">
      <article className="legal">
        <h1>Règles du tirage</h1>
        <p>
          Les règles ci-dessous ne sont pas une promesse de la mairie : elles sont écrites dans le programme de la
          loterie (un « smart contract »), publié sur la blockchain. Personne, pas même la mairie, ne peut les changer
          pendant une loterie.
        </p>

        <h2>En résumé</h2>
        <ul>
          <li>Chaque ticket est une chance : plus vous avez de tickets, plus vous avez de chances de gagner.</li>
          <li>Le gagnant reçoit 100 % de la cagnotte, sans aucune commission.</li>
          <li>Le hasard est fourni par Chainlink, un service indépendant, et vérifiable par tous.</li>
          <li>La mairie ouvre la loterie, mais ne peut ni choisir le gagnant, ni toucher à la cagnotte.</li>
        </ul>

        <h2>1. Ouverture</h2>
        <p>
          La mairie ouvre une loterie et fixe ses réglages : le prix du ticket, le nombre maximal de tickets par
          personne, le nombre de participants attendus et la durée. Ces réglages sont affichés sur la page de la ville
          et ne peuvent plus changer jusqu'à la fin de la loterie.
        </p>
        <p>
          <strong>Prix et cours de l'ETH :</strong> la mairie choisit un prix en euros, converti en ETH au cours du
          jour. Le contrat enregistre ce prix en ETH : il reste fixe en ETH, mais sa valeur en euros (comme celle de la
          cagnotte) monte ou baisse avec le cours de l'ETH pendant la loterie. Les montants en euros affichés sur le
          site sont donc indicatifs.
        </p>

        <h2>2. Achat des tickets</h2>
        <ul>
          <li>Vous payez le prix exact du ticket : un montant différent est refusé.</li>
          <li>Vous pouvez acheter plusieurs tickets, en une ou plusieurs fois, jusqu'au maximum fixé par la mairie.</li>
          <li>
            Un <strong>participant</strong> est un portefeuille. Un <strong>ticket</strong> est une entrée dans le
            tirage. Un participant avec 3 tickets a donc 3 fois plus de chances qu'un participant avec 1 ticket.
          </li>
          <li>Les achats ferment dès que la loterie est terminée (voir ci-dessous).</li>
        </ul>

        <h2>3. Fin de la loterie</h2>
        <p>La loterie se termine dès que l'une de ces deux conditions est remplie :</p>
        <ul>
          <li>le nombre de participants attendus est atteint ;</li>
          <li>ou la date limite est passée.</li>
        </ul>

        <h2>4. Le tirage</h2>
        <ul>
          <li>
            <strong>N'importe qui peut lancer le tirage</strong> une fois la loterie terminée, avec le bouton prévu sur
            la page. Personne n'a besoin d'attendre la mairie.
          </li>
          <li>
            Le programme demande un nombre au hasard à <strong>Chainlink VRF</strong>. Ce nombre est accompagné d'une
            preuve mathématique : n'importe qui peut vérifier qu'il n'a été ni choisi ni modifié, ni par la mairie, ni
            par Chainlink.
          </li>
          <li>
            Ce nombre désigne un ticket parmi tous ceux vendus. Le propriétaire de ce ticket gagne.
          </li>
          <li>
            Si Chainlink ne répond pas dans l'heure, n'importe qui peut relancer la demande : la cagnotte ne peut
            jamais rester bloquée.
          </li>
          <li>Un seul tirage par loterie : une fois lancé, on ne peut ni le relancer pour obtenir un autre gagnant, ni acheter de tickets.</li>
        </ul>

        <h2>5. Les gains</h2>
        <ul>
          <li>Le gagnant reçoit <strong>toute la cagnotte</strong>, envoyée automatiquement sur son portefeuille.</li>
          <li>
            Si l'envoi automatique échoue, les gains lui sont réservés : lui seul peut les récupérer, à tout moment,
            avec le bouton qui apparaît alors sur la page de la ville.
          </li>
          <li>Aucune fonction du programme ne permet à la mairie de retirer de l'argent.</li>
        </ul>

        <h2>Cas particuliers</h2>
        <ul>
          <li>
            <strong>Un seul participant :</strong> le tirage a lieu normalement à la date limite. Tous les tickets
            sont les siens : il gagne la cagnotte, c'est-à-dire qu'il récupère sa mise.
          </li>
          <li>
            <strong>Personne n'a joué :</strong> la loterie est fermée sans gagnant. Il n'y a rien à reverser.
          </li>
        </ul>

        <h2>Tout est vérifiable</h2>
        <p>
          Chaque achat, chaque tirage et chaque gagnant est inscrit sur la blockchain. La rubrique « Transparence » de
          la page de votre ville affiche la liste des tickets, l'historique des loteries et un lien vers l'explorateur
          Etherscan pour tout vérifier par vous-même.
        </p>
        <p>
          Cette version fonctionne sur un réseau de test : les ethers utilisés n'ont aucune valeur. Les montants en
          euros sont indicatifs, au cours de l'ether réel. Voir le <a href="/cadre-legal">cadre légal</a>.
        </p>
      </article>
    </main>
  );
}
