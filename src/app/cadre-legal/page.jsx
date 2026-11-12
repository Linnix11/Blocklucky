export const metadata = { title: "Cadre légal · BlockLucky" };

/**
 * Cadre légal des loteries : droit européen, droit français et situation de BlockLucky.
 * Textes relevés le 12/11/2026 ; à faire valider par un juriste avant toute exploitation réelle.
 */
export default function Page() {
  return (
    <main className="page">
      <article className="legal">
        <h1>Cadre légal des loteries</h1>
        <p>
          Cette page résume les règles européennes et françaises qui encadrent les loteries, et explique pourquoi
          BlockLucky, dans sa version actuelle, reste une démonstration sans argent réel.
        </p>

        <h2>En résumé</h2>
        <ul>
          <li>Il n'existe pas de loi européenne unique sur les loteries : chaque pays fixe ses propres règles.</li>
          <li>En France, les loteries sont interdites par principe, sauf exceptions prévues par la loi.</li>
          <li>
            BlockLucky fonctionne sur un réseau de test : les ethers utilisés n'ont aucune valeur, personne ne mise ni
            ne gagne d'argent réel.
          </li>
        </ul>

        <h2>Droit de l'Union européenne</h2>
        <p>
          <strong>Pas de texte commun.</strong> L'Union européenne n'a pas harmonisé les jeux d'argent et de hasard. Chaque
          État membre décide d'autoriser, d'encadrer ou d'interdire les loteries sur son territoire, et peut réserver
          leur organisation à un opérateur public (en France, la Française des Jeux).
        </p>
        <p>
          <strong>Les jeux d'argent sont exclus des grandes directives sur les services.</strong> La directive
          2006/123/CE « Services » et la directive 2000/31/CE « Commerce électronique » ne s'appliquent pas aux jeux
          d'argent, loteries comprises. Un opérateur autorisé dans un pays ne peut donc pas s'en prévaloir pour proposer
          ses jeux dans un autre.
        </p>
        <p>
          <strong>Ce que dit la Cour de justice de l'Union européenne :</strong>
        </p>
        <ul>
          <li>
            <em>Schindler</em> (C-275/92, 1994) : une loterie est un service au sens des traités européens. Un État peut
            pourtant la restreindre, pour protéger les joueurs et prévenir la fraude.
          </li>
          <li>
            <em>Liga Portuguesa</em> (C-42/07, 2009) : un État peut confier un monopole à un opérateur et interdire aux
            opérateurs d'autres pays de proposer leurs jeux en ligne chez lui.
          </li>
          <li>
            Dans tous les cas, ces restrictions doivent répondre à un motif d'intérêt général (protection des
            joueurs, lutte contre la fraude) et rester proportionnées. Le seul besoin de recettes publiques ne suffit
            pas à les justifier.
          </li>
        </ul>
        <p>
          <strong>Protection des joueurs en ligne.</strong> La recommandation 2014/478/UE de la Commission européenne
          (texte non contraignant) invite les États à vérifier l'âge des joueurs, à afficher clairement l'interdiction
          aux mineurs, à proposer des outils de modération du jeu et à encadrer la publicité.
        </p>
        <p>
          <strong>Lutte contre le blanchiment.</strong> Les prestataires de jeux d'argent sont soumis aux règles
          européennes contre le blanchiment de capitaux. Le règlement (UE) 2024/1624 s'appliquera directement dans
          tous les États membres à partir du 10 juillet 2027 : vérification de l'identité des joueurs, surveillance
          des opérations inhabituelles.
        </p>
        <p>
          <strong>Données personnelles.</strong> Le règlement général sur la protection des données (RGPD, règlement
          (UE) 2016/679) s'applique aux comptes et aux listes d'habitants : voir la{" "}
          <a href="/confidentialite">politique de confidentialité</a>.
        </p>

        <h2>Droit français</h2>
        <p>
          <strong>Interdiction de principe.</strong> Le Code de la sécurité intérieure interdit les loteries de toute
          espèce (article L. 322-1). Est une loterie toute opération proposée au public qui fait naître l'espérance
          d'un gain dû, même partiellement, au hasard, et pour laquelle le participant doit payer (article L. 322-2).
        </p>
        <p>
          <strong>Les exceptions</strong> (articles L. 322-3 et suivants) :
        </p>
        <ul>
          <li>
            les loteries d'objets mobiliers destinées à la bienfaisance, à l'encouragement des arts ou au financement
            d'activités sportives à but non lucratif, autorisées par le maire ;
          </li>
          <li>les lotos traditionnels organisés dans un cercle restreint, avec des mises et des lots de faible valeur ;</li>
          <li>les jeux de la Française des Jeux, seule autorisée à proposer des loteries d'argent au public.</li>
        </ul>
        <p>
          <strong>Le régulateur.</strong> L'Autorité nationale des jeux (ANJ), créée par l'ordonnance n° 2019-1015,
          contrôle les jeux d'argent en France, y compris ceux de la Française des Jeux. Organiser une loterie
          interdite est un délit, puni de peines d'emprisonnement et d'amende.
        </p>

        <h2>Et BlockLucky ?</h2>
        <ul>
          <li>
            <strong>Pas d'argent réel.</strong> Les loteries tournent sur Sepolia, un réseau de test d'Ethereum. Les
            ethers utilisés s'obtiennent gratuitement et ne peuvent pas être échangés contre de l'argent : il n'y a ni
            mise ni gain ayant une valeur.
          </li>
          <li>
            <strong>Accès limité.</strong> Seuls les habitants inscrits par leur mairie peuvent créer un compte et
            jouer sur le site.
          </li>
          <li>
            <strong>Tirage transparent.</strong> Le tirage est réalisé par Chainlink VRF, et chacun peut le vérifier
            sur la blockchain. Ni la mairie ni l'équipe du projet ne peuvent choisir le gagnant ou retirer la cagnotte.
          </li>
          <li>
            <strong>Passage à l'argent réel : hors du projet.</strong> Une vraie loterie en ethers (ou en euros)
            serait, en l'état du droit, une loterie interdite en France. Elle demanderait un cadre légal spécifique
            (par exemple une loterie caritative autorisée par le maire, avec des lots en nature), la vérification de
            l'âge et de l'identité des joueurs, et le respect des règles contre le blanchiment.
          </li>
        </ul>

        <h2>Avertissement</h2>
        <p>
          Cette page présente le cadre juridique de façon simplifiée, à titre d'information. Elle ne constitue pas un
          avis juridique. Avant toute loterie réelle, elle doit être validée par le service juridique de la mairie ou par un avocat.
        </p>

        <h2>Textes de référence</h2>
        <ul>
          <li>
            <a href="https://www.legifrance.gouv.fr/codes/texte_lc/LEGITEXT000025503132/">
              Code de la sécurité intérieure (Légifrance), articles L. 322-1 et suivants
            </a>
          </li>
          <li>
            <a href="https://eur-lex.europa.eu/eli/reco/2014/478/oj/fra">Recommandation 2014/478/UE (EUR-Lex)</a>
          </li>
          <li>
            <a href="https://eur-lex.europa.eu/eli/reg/2024/1624/oj/fra">Règlement (UE) 2024/1624 (EUR-Lex)</a>
          </li>
          <li>
            <a href="https://eur-lex.europa.eu/eli/dir/2006/123/oj/fra">Directive 2006/123/CE « Services » (EUR-Lex)</a>
          </li>
          <li>
            <a href="https://anj.fr">Autorité nationale des jeux (ANJ)</a>
          </li>
        </ul>
      </article>
    </main>
  );
}
