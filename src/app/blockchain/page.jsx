import { ChainDemo } from "@/components/ChainDemo";

export const metadata = { title: "La blockchain en 10 minutes · BlockLucky" };

/** Points du réseau pour le schéma « registre partagé » (cercle de 6 ordinateurs). */
const NODES = Array.from({ length: 6 }, (_, i) => {
  const angle = (i / 6) * 2 * Math.PI - Math.PI / 2;
  return { x: 150 + 95 * Math.cos(angle), y: 100 + 70 * Math.sin(angle) };
});

/** Schéma : un registre tenu par une seule entité, face à un registre copié chez tous. */
function LedgerDiagram() {
  return (
    <div className="course-figures">
      <figure className="course-figure">
        <svg viewBox="0 0 300 200" role="img" aria-labelledby="ledger-central">
          <title id="ledger-central">Registre classique : tous les utilisateurs dépendent d'un serveur central.</title>
          {NODES.map((n, i) => (
            <line key={i} x1="150" y1="100" x2={n.x} y2={n.y} className="svg-link" />
          ))}
          <rect x="112" y="76" width="76" height="48" rx="8" className="svg-central" />
          <text x="150" y="105" textAnchor="middle" className="svg-label svg-on-dark">
            Banque
          </text>
          {NODES.map((n, i) => (
            <circle key={i} cx={n.x} cy={n.y} r="14" className="svg-user" />
          ))}
        </svg>
        <figcaption>
          <strong>Registre classique.</strong> Une seule entité tient le registre. Si elle se trompe, triche ou tombe
          en panne, tout le monde en dépend.
        </figcaption>
      </figure>

      <figure className="course-figure">
        <svg viewBox="0 0 300 200" role="img" aria-labelledby="ledger-shared">
          <title id="ledger-shared">Blockchain : chaque ordinateur du réseau garde une copie du registre.</title>
          {NODES.flatMap((a, i) =>
            NODES.slice(i + 1).map((b, j) => (
              <line key={`${i}-${j}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="svg-link" />
            ))
          )}
          {NODES.map((n, i) => (
            <g key={i}>
              <circle cx={n.x} cy={n.y} r="17" className="svg-node" />
              <rect x={n.x - 8} y={n.y - 9} width="16" height="18" rx="2" className="svg-page" />
              <line x1={n.x - 4} y1={n.y - 3} x2={n.x + 4} y2={n.y - 3} className="svg-page-line" />
              <line x1={n.x - 4} y1={n.y + 2} x2={n.x + 4} y2={n.y + 2} className="svg-page-line" />
            </g>
          ))}
        </svg>
        <figcaption>
          <strong>Blockchain.</strong> Des milliers d'ordinateurs gardent chacun la même copie du registre et
          vérifient chaque nouvelle ligne. Personne ne peut le modifier seul.
        </figcaption>
      </figure>
    </div>
  );
}

/** Étapes d'une transaction, de votre portefeuille jusqu'au bloc. */
const TX_STEPS = [
  ["Vous signez", "Votre portefeuille (MetaMask) signe la demande avec votre clé secrète, comme une signature manuscrite impossible à imiter."],
  ["Le réseau reçoit", "La transaction est envoyée aux ordinateurs du réseau, qui vérifient la signature et le solde."],
  ["Un bloc est formé", "Toutes les 12 secondes environ sur Ethereum, un validateur rassemble des transactions dans un nouveau bloc."],
  ["Tout le monde vérifie", "Les autres ordinateurs contrôlent le bloc puis l'ajoutent à leur copie. La transaction est inscrite pour toujours."],
];

/** Le parcours d'une loterie BlockLucky, vu comme un programme sur la blockchain. */
const LOTTERY_FLOW = [
  ["Ouverture", "La mairie fixe le prix, la durée et le nombre de participants."],
  ["Tickets", "Les habitants paient : l'argent va dans le contrat, pas chez la mairie."],
  ["Hasard", "Chainlink fournit un nombre aléatoire avec une preuve vérifiable."],
  ["Gagnant", "Le contrat envoie toute la cagnotte au ticket tiré, automatiquement."],
];

/** Liens pour aller plus loin (vérifiés le 13/11/2026). */
const LINKS = [
  ["https://ethereum.org/fr/what-is-ethereum/", "Qu'est-ce qu'Ethereum ?", "ethereum.org, le site officiel, en français. Le meilleur point de départ."],
  ["https://ethereum.org/fr/smart-contracts/", "Les smart contracts", "ethereum.org : comment un programme peut vivre sur la blockchain."],
  ["https://ethereum.org/fr/wallets/", "Les portefeuilles", "ethereum.org : à quoi sert un portefeuille et comment en choisir un."],
  ["https://ethereum.org/fr/developers/docs/consensus-mechanisms/pos/", "La preuve d'enjeu", "ethereum.org : comment les validateurs se mettent d'accord (niveau intermédiaire)."],
  ["https://ethereum.org/fr/developers/docs/networks/", "Réseaux de test", "ethereum.org : Sepolia et les autres réseaux pour s'entraîner sans argent réel."],
  ["https://andersbrownworth.com/blockchain/", "Démo interactive d'Anders Brownworth", "Une version plus complète de la démonstration ci-dessus (en anglais)."],
  ["https://bitcoin.org/files/bitcoin-paper/bitcoin_fr.pdf", "Le livre blanc de Bitcoin", "Le texte fondateur de Satoshi Nakamoto (2008), traduit en français."],
  ["https://docs.chain.link/vrf", "Chainlink VRF", "La documentation du service de hasard vérifiable utilisé par BlockLucky (en anglais)."],
  ["https://www.cnil.fr/fr/blockchain-et-rgpd-quelles-solutions-pour-un-usage-responsable-en-presence-de-donnees-personnelles", "Blockchain et RGPD", "La CNIL explique les enjeux de la blockchain pour les données personnelles."],
  ["https://sepolia.etherscan.io/", "Etherscan (Sepolia)", "L'explorateur qui affiche tout ce qui se passe sur le réseau de test, y compris nos loteries."],
];

/**
 * Petit cours d'initiation à la blockchain, pour les habitants curieux :
 * notions de base, schémas, démonstration interactive et liens pour aller plus loin.
 */
export default function Page() {
  return (
    <main className="page">
      <article className="legal course">
        <p className="course-kicker">Initiation · 10 minutes</p>
        <h1>La blockchain, simplement</h1>
        <p className="course-lead">
          Vous avez entendu parler de blockchain, de Bitcoin ou d'Ethereum sans trop savoir de quoi il s'agit ? Cette
          page explique l'essentiel, sans jargon, avec l'exemple de la loterie de votre ville.
        </p>

        <nav className="course-toc" aria-label="Sommaire">
          <ol>
            <li><a href="#registre">Un registre partagé</a></li>
            <li><a href="#blocs">Des blocs enchaînés</a></li>
            <li><a href="#transaction">Le trajet d'une transaction</a></li>
            <li><a href="#contrats">Les smart contracts</a></li>
            <li><a href="#portefeuille">Votre portefeuille</a></li>
            <li><a href="#limites">Les limites</a></li>
            <li><a href="#glossaire">Petit glossaire</a></li>
            <li><a href="#plus-loin">Pour aller plus loin</a></li>
          </ol>
        </nav>

        <h2 id="registre">1. Un registre partagé</h2>
        <p>
          Une blockchain est un <strong>registre</strong> : un grand cahier où l'on note qui possède quoi et qui a
          envoyé quoi à qui. Sa particularité : ce cahier n'est pas rangé chez une banque ou une administration. Il
          est <strong>copié sur des milliers d'ordinateurs</strong> dans le monde, qui le tiennent à jour ensemble.
        </p>
        <LedgerDiagram />

        <h2 id="blocs">2. Des blocs enchaînés</h2>
        <p>
          Les lignes du registre sont regroupées par paquets : les <strong>blocs</strong>. Chaque bloc reçoit une{" "}
          <strong>empreinte</strong>, une suite de caractères calculée à partir de son contenu. Changez une seule
          lettre du contenu, et l'empreinte change complètement.
        </p>
        <p>
          Chaque bloc contient aussi l'empreinte du bloc précédent. Les blocs sont ainsi enchaînés : modifier un
          ancien bloc casse toute la suite. Essayez vous-même :
        </p>
        <ChainDemo />

        <h2 id="transaction">3. Le trajet d'une transaction</h2>
        <p>Quand vous achetez un ticket BlockLucky, voici ce qui se passe en quelques secondes :</p>
        <ol className="course-steps">
          {TX_STEPS.map(([title, text]) => (
            <li key={title}>
              <strong>{title}</strong>
              <span>{text}</span>
            </li>
          ))}
        </ol>
        <p>
          Pour se mettre d'accord sans chef, Ethereum utilise la <strong>preuve d'enjeu</strong> : les validateurs
          bloquent une somme en garantie et la perdent s'ils trichent. Tricher coûte donc plus cher que ce qu'on
          pourrait y gagner.
        </p>

        <h2 id="contrats">4. Les smart contracts</h2>
        <p>
          Sur Ethereum, on peut inscrire dans la blockchain non seulement des paiements, mais aussi des{" "}
          <strong>programmes</strong> : les smart contracts (« contrats intelligents »). Une fois publiés, ils
          s'exécutent exactement comme prévu, et personne ne peut les modifier, pas même leur auteur.
        </p>
        <p>
          On les compare souvent à un <strong>distributeur automatique</strong> : vous mettez la bonne pièce, vous
          obtenez la boisson, sans vendeur. BlockLucky fonctionne ainsi :
        </p>
        <ol className="course-flow" aria-label="Le parcours d'une loterie BlockLucky">
          {LOTTERY_FLOW.map(([title, text], i) => (
            <li key={title}>
              <span className="course-flow-num" aria-hidden="true">{i + 1}</span>
              <strong>{title}</strong>
              <span>{text}</span>
            </li>
          ))}
        </ol>
        <p>
          Les règles exactes de notre tirage sont détaillées sur la page <a href="/regles">Règles du tirage</a>.
        </p>

        <h2 id="portefeuille">5. Votre portefeuille</h2>
        <p>
          Pour agir sur la blockchain, il faut un <strong>portefeuille</strong> (en anglais « wallet ») comme
          MetaMask. Il ne contient pas vraiment l'argent : l'argent est inscrit dans la blockchain. Le portefeuille
          garde surtout votre <strong>clé secrète</strong>, qui prouve que vous êtes bien le propriétaire.
        </p>
        <ul>
          <li>Votre <strong>adresse</strong> (0x…) est publique : c'est comme un numéro de compte que l'on peut partager.</li>
          <li>
            Votre <strong>phrase secrète</strong> (12 mots) ne doit être donnée à personne, jamais. Quiconque la
            possède peut vider le portefeuille, et aucun service client ne pourra annuler l'opération.
          </li>
          <li>Pour s'entraîner, utilisez un réseau de test comme Sepolia : les ethers y sont gratuits et sans valeur.</li>
        </ul>

        <h2 id="limites">6. Les limites</h2>
        <p>La blockchain n'est pas magique. Il est utile d'en connaître les limites :</p>
        <ul>
          <li><strong>Pas de retour en arrière :</strong> une erreur d'adresse ou une arnaque ne peut pas être annulée.</li>
          <li><strong>Frais de réseau :</strong> chaque opération coûte un peu (le « gas »), plus cher quand le réseau est chargé.</li>
          <li>
            <strong>Tout est public :</strong> les opérations sont visibles par tous. Les adresses ne portent pas de nom,
            mais on peut parfois les relier à une personne.
          </li>
          <li>
            <strong>Le monde réel reste hors de la blockchain :</strong> elle ne sait pas seule qui vous êtes ni quel
            temps il fait. Il faut des services extérieurs fiables (comme Chainlink pour le hasard).
          </li>
          <li><strong>Prudence avec les cryptomonnaies :</strong> leur valeur varie fortement, et les arnaques sont nombreuses.</li>
        </ul>

        <h2 id="glossaire">7. Petit glossaire</h2>
        <dl className="course-glossary">
          <dt>Bloc</dt>
          <dd>Un paquet de transactions ajouté au registre.</dd>
          <dt>Empreinte (hash)</dt>
          <dd>Un code calculé à partir d'un contenu ; il change dès que le contenu change.</dd>
          <dt>Ether (ETH)</dt>
          <dd>La monnaie du réseau Ethereum, qui sert aussi à payer les frais.</dd>
          <dt>Gas</dt>
          <dd>Les frais payés pour qu'une opération soit traitée par le réseau.</dd>
          <dt>Smart contract</dt>
          <dd>Un programme publié sur la blockchain, qui s'exécute tout seul selon ses règles.</dd>
          <dt>Portefeuille (wallet)</dt>
          <dd>L'application qui garde votre clé secrète et signe vos opérations.</dd>
          <dt>Sepolia</dt>
          <dd>Un réseau de test d'Ethereum, où les ethers n'ont pas de valeur.</dd>
          <dt>Oracle</dt>
          <dd>Un service qui apporte une information extérieure à la blockchain (par exemple, un nombre au hasard).</dd>
        </dl>

        <h2 id="plus-loin">8. Pour aller plus loin</h2>
        <ul className="course-links">
          {LINKS.map(([href, title, text]) => (
            <li key={href}>
              <a href={href} target="_blank" rel="noopener noreferrer">
                {title}
                <span className="visually-hidden"> (nouvel onglet)</span>
              </a>
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </article>
    </main>
  );
}
