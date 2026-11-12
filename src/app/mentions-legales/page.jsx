export const metadata = { title: "Mentions légales · BlockLucky" };

/**
 * Mentions légales (loi n° 2004-575 du 21 juin 2004, LCEN, art. 6).
 * Éditeur et directeur de la publication fictifs (ville d'EtherBay, cas du projet) : à remplacer par les vraies
 * informations de la mairie avant toute mise en production. Le numéro est dans la plage ARCEP réservée à la fiction.
 */
export default function Page() {
  return (
    <main className="page">
      <article className="legal">
        <h1>Mentions légales</h1>
        <p className="muted">
          Projet de démonstration : la ville d'EtherBay et les coordonnées ci-dessous sont fictives.
        </p>

        <h2>Éditeur du site</h2>
        <p>
          Mairie d'EtherBay
          <br />1 place de l'Hôtel-de-Ville, 99000 EtherBay
          <br />Téléphone : 01 99 00 12 34
          <br />Mail : <a href="mailto:contact@etherbay.example">contact@etherbay.example</a>
          <br />SIRET : 000 000 000 00000
        </p>
        <p>
          BlockLucky a été conçu par une équipe d'étudiants d'Epitech Digital School dans le cadre d'un partenariat avec
          les mairies participantes.
        </p>

        <h2>Directeur ou directrice de la publication</h2>
        <p>Camille Martin, maire d'EtherBay.</p>

        <h2>Hébergement</h2>
        <p>
          Hostinger International Ltd.
          <br />61 Lordou Vironos Street, 6023 Larnaca, Chypre
          <br />
          <a href="https://www.hostinger.fr">www.hostinger.fr</a>
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
