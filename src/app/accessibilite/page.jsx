import { Todo } from "@/components/Todo";

export const metadata = { title: "Déclaration d'accessibilité · BlockLucky" };

/** Déclaration d'accessibilité (loi n° 2005-102, art. 47 ; RGAA ; directive européenne 2016/2102). */
export default function Page() {
  return (
    <main className="page">
      <article className="legal">
        <h1>Déclaration d'accessibilité</h1>
        <p>
          <Todo>nom de l'organisme</Todo> s'engage à rendre son service accessible, conformément à l'article 47 de la loi
          n° 2005-102 du 11 février 2005. Cette déclaration s'applique au site BlockLucky.
        </p>
        <p>
          Schéma pluriannuel de mise en accessibilité et plan d'action : <Todo>lien ou document</Todo>
        </p>

        <h2>État de conformité</h2>
        <p>
          Le site BlockLucky est <strong>non conforme</strong> avec le référentiel général d'amélioration de
          l'accessibilité (RGAA) : aucun audit de conformité n'a encore été réalisé.
        </p>

        <h2>Mesures déjà prises</h2>
        <ul>
          <li>Contrastes des textes vérifiés pour chaque design (au moins 4,5:1).</li>
          <li>Site utilisable entièrement au clavier, avec un repère visible sur l'élément actif.</li>
          <li>Champs de formulaire tous accompagnés d'un libellé ; messages d'erreur annoncés aux lecteurs d'écran.</li>
          <li>Animations réduites si votre système le demande.</li>
          <li>Pages conçues d'abord pour les écrans de téléphone.</li>
        </ul>

        <h2>Contenus connus comme difficiles d'accès</h2>
        <ul>
          <li>MetaMask, application tierce nécessaire pour acheter des tickets, dont l'accessibilité ne dépend pas de nous.</li>
          <li>Adresses de portefeuille (0x…), longues suites de caractères difficiles à lire et à vérifier.</li>
        </ul>

        <h2>Établissement de cette déclaration</h2>
        <p>
          Déclaration établie le <Todo>date</Todo>. Technologies utilisées : HTML, CSS, JavaScript.
        </p>

        <h2>Retour d'information et contact</h2>
        <p>
          Si vous n'arrivez pas à accéder à un contenu ou à un service, contactez <Todo>mail ou formulaire de contact</Todo>{" "}
          pour être orienté vers une alternative accessible ou obtenir le contenu sous une autre forme.
        </p>

        <h2>Voies de recours</h2>
        <p>
          Si vous constatez un défaut d'accessibilité qui vous empêche d'accéder à un contenu ou à un service, que vous
          nous l'avez signalé et que vous n'avez pas obtenu de réponse satisfaisante, vous pouvez saisir le Défenseur des
          droits : par le formulaire de contact en ligne (defenseurdesdroits.fr), auprès de l'un de ses délégués dans
          votre région, ou par courrier gratuit, sans timbre : Défenseur des droits, Libre réponse 71120, 75342 Paris
          CEDEX 07.
        </p>
      </article>
    </main>
  );
}
