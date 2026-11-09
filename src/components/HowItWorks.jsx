/** « Comment ça marche ? » en 3 étapes, et tutoriel MetaMask pour les débutants. */
export function HowItWorks({ network }) {
  return (
    <section className="how" aria-labelledby="how-title">
      <h2 id="how-title">Comment ça marche ?</h2>
      <div className="how-layout">
        <ol className="steps">
          <li>
            <h3>Je prépare mon portefeuille</h3>
            <p>
              J'installe MetaMask, une application gratuite qui garde mes ethers, et je récupère des ethers de test.
              Ce sont des ethers fictifs : on joue sans vrai argent.
            </p>
          </li>
          <li>
            <h3>J'achète mes tickets</h3>
            <p>
              De 1 à 5 tickets par personne. Chaque ticket est une chance de plus, et chaque achat est visible par tous
              dans la partie Transparence.
            </p>
          </li>
          <li>
            <h3>Le tirage désigne un gagnant</h3>
            <p>
              Quand le nombre de participants est atteint ou que l'heure est passée, la mairie lance le tirage.
              Chainlink tire au sort, et le gagnant reçoit toute la cagnotte automatiquement.
            </p>
          </li>
        </ol>

        <details className="tutorial">
          <summary>Première fois avec MetaMask ? Le guide en 5 minutes</summary>
          <ol>
            <li>
              Installez l'extension depuis{" "}
              <a href="https://metamask.io/download/" target="_blank" rel="noreferrer">
                metamask.io
              </a>{" "}
              (ou l'application mobile MetaMask, puis ouvrez ce site depuis son navigateur intégré).
            </li>
            <li>Créez un portefeuille et notez la phrase secrète sur papier. Ne la donnez jamais à personne, ni à la mairie.</li>
            <li>Dans MetaMask, activez « Afficher les réseaux de test ». Le bouton « Passer sur {network.shortName} » de ce site s'occupe du reste.</li>
            {network.faucet && (
              <li>
                Récupérez des ethers de test gratuits sur le{" "}
                <a href={network.faucet} target="_blank" rel="noreferrer">
                  robinet Chainlink
                </a>
                .
              </li>
            )}
            <li>Revenez ici, cliquez sur « Connecter mon portefeuille », puis achetez vos tickets.</li>
          </ol>
        </details>
      </div>
    </section>
  );
}
