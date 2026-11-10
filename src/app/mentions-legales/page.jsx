import { Todo } from "@/components/Todo";

export const metadata = { title: "Mentions légales · BlockLucky" };

/** Mentions légales (loi n° 2004-575 du 21 juin 2004, LCEN, art. 6). */
export default function Page() {
  return (
    <main className="page">
      <article className="legal">
        <h1>Mentions légales</h1>

        <h2>Éditeur du site</h2>
        <p>
          <Todo>nom de la mairie ou de l'organisme éditeur, adresse, téléphone, mail</Todo>
        </p>
        <p>
          BlockLucky a été conçu par une équipe d'étudiants d'Epitech Digital School dans le cadre d'un partenariat avec
          les mairies participantes.
        </p>

        <h2>Directeur ou directrice de la publication</h2>
        <p>
          <Todo>nom et fonction (pour une mairie : en général le maire)</Todo>
        </p>

        <h2>Hébergement</h2>
        <p>
          Hostinger International Ltd. <Todo>adresse du siège, à vérifier sur le contrat d'hébergement</Todo>
        </p>

        <h2>Nature du service</h2>
        <p>
          BlockLucky est une loterie de démonstration fonctionnant sur Sepolia, un réseau de test d'Ethereum. Les ethers
          utilisés sont fictifs et n'ont aucune valeur : aucun argent réel n'est engagé ni gagné. Le tirage au sort est
          réalisé par Chainlink VRF et peut être vérifié publiquement sur la blockchain.
        </p>

        <h2>Données personnelles et accessibilité</h2>
        <p>
          Voir la <a href="/confidentialite">politique de confidentialité</a> et la{" "}
          <a href="/accessibilite">déclaration d'accessibilité</a>.
        </p>
      </article>
    </main>
  );
}
