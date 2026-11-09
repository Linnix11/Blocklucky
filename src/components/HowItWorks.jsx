/** « Comment ça marche » en 3 étapes courtes, et guide MetaMask pour les débutants. */
export function HowItWorks({ network }) {
  return (
    <section className="card how" aria-labelledby="how-title">
      <h2 id="how-title">Comment ça marche</h2>
      <ol className="steps">
        <li>
          <strong>Connectez MetaMask</strong>
          <span>Une application gratuite qui garde vos ethers de test. On joue sans vrai argent.</span>
        </li>
        <li>
          <strong>Posez vos jetons</strong>
          <span>De 1 à 5 tickets par personne. Chaque achat est visible par tous, plus bas dans la page.</span>
        </li>
        <li>
          <strong>Chainlink tire le gagnant</strong>
          <span>À la fin de la vente, la mairie lance le tirage. Toute la cagnotte va au gagnant.</span>
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
          <li>Revenez ici, cliquez sur « Connecter mon portefeuille », puis posez vos jetons.</li>
        </ol>
      </details>
    </section>
  );
}
