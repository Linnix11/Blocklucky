# Soutenance BlockLucky : fiche de préparation

## 1. Liste de vérifications

### La veille

- [ ] Site en ligne (https://block.axionstudio.fr) testé sur un téléphone en 4G, pas seulement le wifi de l'école
- [ ] Mairie de démo créée depuis l'admin, avec son design et la liste des 5 comptes de démo comme habitants
- [ ] Souscription Chainlink VRF : **au moins 0,65 ETH**, contrats des villes bien listés dans « Consumers »
- [ ] Compte du serveur (`PRIVATE_KEY`) avec des ETH de test (chaque action de la mairie est une transaction)
- [ ] **5 comptes MetaMask de démo** avec chacun ≥ 0,01 ETH de test (faucets : les remplir à l'avance,
      ils limitent souvent le nombre de retraits)
- [ ] Une loterie de répétition complète faite sur Sepolia, de l'achat au gagnant (chronométrer le délai Chainlink)
- [ ] **Vidéo de secours** de cette répétition enregistrée (écran + voix), sur l'ordinateur ET une clé USB
- [ ] Démo de secours testée sur l'ordinateur de la soutenance : MySQL démarré, `npm run demo:locale`, comptes
      Hardhat importés dans un **profil de navigateur séparé** (pour ne pas mélanger avec les comptes Sepolia)

### Le jour J, 30 minutes avant

- [ ] La loterie précédente est close (espace mairie : « Aucune loterie en cours »). Sinon : lancer son tirage maintenant
- [ ] Ouvrir la loterie de démo depuis l'espace mairie avec une **durée longue (60 min)** : la fin viendra
      des 5 participants, pas du chrono, pour ne pas être pris de court
- [ ] Faire acheter 3 participants à l'avance (comptes 1 à 3) : en démo, il n'en reste que 2 à faire en direct
- [ ] Onglets ouverts : la page de la ville, l'espace mairie (connecté), le contrat sur Etherscan, la souscription
      sur vrf.chain.link, la vidéo
- [ ] Notifications coupées, luminosité au maximum, zoom du navigateur à 125 %

## 2. Déroulé de la démo (environ 8 minutes)

| Min. | Qui parle à qui | Ce qu'on montre | Message |
|---|---|---|---|
| 0:00 | Madame la Maire | La page de la ville sur téléphone : le ticket, la cagnotte, le design choisi par la mairie | « Une loterie des fêtes que chaque habitant peut vérifier lui-même. » |
| 1:00 | Responsable évènementiel | « Comment ça marche », le guide MetaMask, l'espace mairie (import CSV, choix du design) | 3 étapes, aucun jargon, ethers fictifs ; la mairie gère tout sans portefeuille |
| 2:00 | Responsable évènementiel | Achat de 2 tickets en direct (compte 4) : choix du nombre, confirmation, cagnotte qui augmente | Parcours fluide, chaque cas d'erreur expliqué en français |
| 3:00 | Madame la Maire | 5ᵉ participant (compte 5) : la vente se ferme. Dans l'espace mairie, **« Lancer le tirage »** | La mairie lance le tirage, mais n'importe qui pourrait le faire : elle n'a aucun pouvoir sur le résultat |
| 3:30 | DSI | Pendant que Chainlink répond (1 à 3 min) : partie Transparence, contrat vérifié sur Etherscan, la souscription VRF | Code public, hasard prouvé, aucune fonction de retrait |
| 5:00 | Tous | **Annonce du gagnant, confettis** (environ 30 s après la réponse de Chainlink) | Le moment fort : laisser 5 secondes de silence |
| 5:30 | DSI | La transaction du gagnant sur Etherscan : l'argent arrive directement | 100 % de la cagnotte, sans intermédiaire |
| 6:00 | DSI | `docs/securite.md` : la faille Chainlink évitée, les 44 tests, 100 % de couverture, les limites assumées | Rigueur et honnêteté sur les limites |
| 7:00 | Madame la Maire | Pistes : 10 000 participants, couche 2, cadre légal (ANJ), pages RGPD et accessibilité | Une vision pour le vrai évènement |

Si Chainlink tarde plus de 3 minutes : continuer sur la sécurité, revenir au site ensuite (le gagnant
s'affiche tout seul, l'écran se met à jour en direct).

## 3. Plan B

| Problème | Bascule |
|---|---|
| Sepolia ou le wifi en panne | `npm run demo:locale` (MySQL démarré) : même déroulé ; après « Lancer le tirage », `npm run fulfill:local` dans un autre terminal joue le rôle de Chainlink |
| Chainlink ne répond pas au bout de 5 min | Montrer la vidéo de secours pour la fin du tirage, et expliquer `retryDraw` (relance au bout d'1 h depuis l'espace mairie) : c'est un argument de fiabilité |
| MetaMask refuse une transaction (« nonce ») | Paramètres > Avancé > « Effacer les données d'activité », puis recommencer |
| Ordinateur en panne | Vidéo de secours sur la clé USB + site en ligne sur un téléphone |

## 4. Les 10 questions techniques du DSI

**1. Comment prouvez-vous que le tirage n'est pas truqué ?**
Le nombre aléatoire vient de Chainlink VRF avec une preuve cryptographique vérifiée par la blockchain.
Seule l'adresse Chainlink fixée au déploiement peut le fournir, et seulement pour la demande en cours.
Le gagnant est calculé publiquement : nombre aléatoire modulo nombre de tickets.

**2. La mairie peut-elle influencer le résultat ou récupérer la cagnotte ?**
Non. Le propriétaire de chaque contrat est le compte du serveur, qui agit à la demande de la mairie, et
son seul pouvoir est d'ouvrir une loterie. Aucune fonction de retrait n'existe, et un test vérifie la
liste exacte des fonctions du contrat. Nous avons même écarté la base Chainlink standard, dont la
fonction `setCoordinator` aurait permis au propriétaire de brancher un faux hasard.

**3. Pourquoi ne pas utiliser l'heure du bloc ou `prevrandao` comme hasard ? C'est gratuit.**
Ces valeurs sont connues ou influençables par les validateurs : l'un d'eux pourrait choisir de publier
ou non un bloc selon le résultat. VRF coûte un peu d'ETH par tirage, mais c'est la seule option défendable devant
des habitants.

**4. Et si Chainlink ne répond jamais ?**
Le tirage reste en attente, les achats sont bloqués, la cagnotte est intacte. Après 1 h, n'importe qui
peut relancer le tirage avec `retryDraw()`. Limite assumée : en théorie, un opérateur Chainlink
malhonnête pourrait retenir un résultat pour en obtenir un autre ; nous l'avons jugé préférable à une
cagnotte bloquée pour toujours.

**5. Comment vous protégez-vous de la réentrance ?**
Ordre « vérifier, modifier l'état, puis payer » partout, verrou `nonReentrant` d'OpenZeppelin sur le
retrait, et solde remis à zéro avant l'envoi. Un contrat attaquant dans nos tests tente le double
retrait : il est bloqué.

**6. Que se passe-t-il si le gagnant est un contrat qui refuse l'argent, ou qui consomme tout le gas ?**
L'envoi automatique ne lui transmet que 50 000 unités de gas. S'il échoue, la fonction ne s'arrête pas
en erreur, sinon Chainlink ne réessaierait pas et la loterie serait bloquée : les gains lui sont
réservés et il les récupère avec `withdrawPrize()`. Les deux cas sont testés.

**7. Ça tient vraiment 10 000 participants ?**
Oui : aucune fonction qui modifie le contrat ne parcourt la liste des tickets. Les tickets sont rangés
par loterie, donc on n'efface jamais une liste de 10 000 entrées (cela dépasserait la capacité d'un
bloc). Un achat coûte 97 000 à 193 000 gas, le tirage environ 132 000, quel que soit le nombre de
joueurs. Amélioration prévue : paginer la lecture des tickets côté interface.

**8. Un validateur peut-il voir le résultat avant tout le monde et en profiter ?**
Non. Dès que le tirage est demandé, la loterie passe en « tirage en cours » : plus aucun achat n'est
possible. Voir le nombre aléatoire un instant avant sa publication ne permet donc rien.

**9. Comment avez-vous testé ?**
43 tests automatiques couvrant 100 % des lignes et des branches du contrat, avec un faux Chainlink, un
contrat qui refuse les ETH et un contrat attaquant. Analyse statique Slither : aucune faille, chaque
alerte est justifiée par écrit. Parcours complet testé dans un vrai navigateur.

**10. Le contrat peut-il être mis à jour si vous trouvez un bug ?**
Non, volontairement : pas de mécanisme de mise à jour, donc personne ne peut changer les règles en
douce. En cas de bug, on déploie un nouveau contrat pour la loterie suivante ; la loterie en cours va à
son terme avec les règles annoncées. Avant de jouer avec de l'argent réel : audit externe obligatoire.

### Questions bonus, si le temps le permet

- **Le modulo ne favorise-t-il pas certains tickets ?** Le nombre aléatoire fait 256 bits : l'écart
  entre tickets est de l'ordre de 10 000 / 2²⁵⁶, impossible à mesurer.
- **Qui paie Chainlink ?** La mairie, via une souscription approvisionnée en ETH. Un tirage coûte environ
  0,01 ETH ; les joueurs ne paient que leurs tickets et les frais de réseau.
- **Et la clé du serveur ?** Volée, elle permet d'ouvrir des loteries, de céder la propriété des contrats
  ou de vider la souscription Chainlink (ce qui bloque les tirages), jamais de toucher aux cagnottes ni de
  choisir un gagnant. Pour le vrai évènement : coffre matériel ou portefeuille multi-signatures.
- **Seuls les habitants inscrits peuvent-ils jouer ?** Sur le site, oui ; le contrat, lui, accepte toute
  adresse. Choix assumé : un contrôle dans le contrat empêcherait de jouer avec le portefeuille de son choix
  après connexion par mail. Pour de l'argent réel : signature du serveur vérifiée par le contrat.
