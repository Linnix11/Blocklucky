export const metadata = { title: "Politique de confidentialité · BlockLucky" };

/** Information des personnes (RGPD, art. 13 et 14). */
export default function Page() {
  return (
    <main className="page">
      <article className="legal">
        <h1>Politique de confidentialité</h1>
        <p className="muted">Dernière mise à jour : 12 novembre 2026. Projet de démonstration : les contacts de la ville d'EtherBay sont fictifs.</p>

        <h2>Qui est responsable de vos données ?</h2>
        <ul>
          <li>
            <strong>Votre mairie</strong> est responsable de la liste des habitants autorisés à participer à sa loterie.
          </li>
          <li>
            <strong>L'éditeur du site</strong> (voir les <a href="/mentions-legales">mentions légales</a>) est
            responsable des comptes et des connexions.
          </li>
        </ul>
        <p>
          Délégué ou déléguée à la protection des données : service Protection des données de la mairie d'EtherBay,{" "}
          <a href="mailto:dpo@etherbay.example">dpo@etherbay.example</a>
        </p>

        <h2>Quelles données, pourquoi, combien de temps ?</h2>
        <table>
          <thead>
            <tr>
              <th scope="col">Donnée</th>
              <th scope="col">Pourquoi</th>
              <th scope="col">Durée de conservation</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Mail</td>
              <td>Vérifier que vous êtes inscrit par votre mairie, vous connecter</td>
              <td>
                Jusqu'au retrait par la mairie ou la suppression du compte. Au plus 1 an après la dernière loterie de la mairie.
              </td>
            </tr>
            <tr>
              <td>Mot de passe</td>
              <td>Protéger votre compte</td>
              <td>Comme le compte. Il n'est jamais conservé en clair : seule une empreinte chiffrée (scrypt) est stockée.</td>
            </tr>
            <tr>
              <td>Adresse de portefeuille (0x…)</td>
              <td>Vérifier que le portefeuille est autorisé à participer</td>
              <td>Jusqu'au retrait par la mairie</td>
            </tr>
            <tr>
              <td>Cookie de connexion « sid »</td>
              <td>Rester connecté</td>
              <td>30 jours au plus, puis effacé</td>
            </tr>
            <tr>
              <td>Journaux techniques (adresse IP)</td>
              <td>Sécurité et bon fonctionnement du serveur</td>
              <td>12 mois au plus</td>
            </tr>
          </tbody>
        </table>
        <p>
          Base légale : la mission d'intérêt public de la mairie (RGPD, art. 6-1-e), pour l'animation de la vie locale.
        </p>

        <h2>Ce qui est public sur la blockchain</h2>
        <p>
          Les achats de tickets, les adresses de portefeuille qui les ont payés et le résultat des tirages sont inscrits
          sur la blockchain Sepolia. Ces informations sont <strong>publiques et ne peuvent être ni modifiées, ni
          effacées</strong>, y compris par la mairie. Votre nom et votre mail n'y figurent jamais. Pour plus de
          discrétion, utilisez un portefeuille que vous ne reliez pas à votre identité.
        </p>

        <h2>Avec qui vos données sont-elles partagées ?</h2>
        <ul>
          <li>
            <strong>Hébergeur</strong> du site et de la base de données : Hostinger, serveurs situés dans l'Union européenne.
          </li>
          <li>
            <strong>Fournisseur d'accès à la blockchain</strong> : pour afficher la loterie, votre navigateur interroge un
            nœud Ethereum qui reçoit votre adresse IP. Par défaut PublicNode (Allnodes), ou le fournisseur choisi par la mairie.
          </li>
          <li>
            <strong>Google (Gemini)</strong>, uniquement si votre mairie fait générer un design personnalisé : reçoit
            la description du style rédigée par la mairie, sans donnée sur les habitants.
          </li>
          <li>
            <strong>MetaMask</strong>, si vous l'utilisez : c'est une application que vous installez vous-même, soumise à
            ses propres conditions.
          </li>
        </ul>
        <p>
          Aucune donnée n'est vendue. Le site n'utilise ni publicité, ni outil de mesure d'audience, ni police ou script
          chargé depuis un site tiers.
        </p>

        <h2>Cookies</h2>
        <p>
          Le site dépose un seul cookie, « sid », uniquement si vous vous connectez. Il est strictement nécessaire au
          fonctionnement du service : il ne demande donc pas votre consentement.
        </p>

        <h2>Vos droits</h2>
        <p>
          Vous pouvez demander l'accès à vos données, leur rectification, leur effacement (sauf ce qui est inscrit sur la
          blockchain), la limitation de leur traitement, ou vous y opposer, en écrivant à{" "}
          <a href="mailto:dpo@etherbay.example">dpo@etherbay.example</a>.
          Vous pouvez aussi adresser une réclamation à la CNIL (cnil.fr).
        </p>
      </article>
    </main>
  );
}
