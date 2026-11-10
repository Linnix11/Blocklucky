# Plan du projet BlockLucky

> Rush de 48 h, Epitech Digital School, pour la ville d'EtherBay.
> Ce document résume le projet de bout en bout : objectifs, périmètre, organisation, décisions et risques.
> La sécurité est détaillée dans `securite.md`, la démo dans `soutenance.md`.

## 1. Le besoin

La ville d'EtherBay (120 000 habitants, dont 35 % de 18 à 35 ans) veut faire sa **loterie des fêtes sur la
blockchain** pour que le tirage soit transparent et digne de confiance, avec un objectif de
**10 000 participants**.

Les habitants achètent des tickets en ethers fictifs (réseau de test Sepolia). Quand le nombre de
participants est atteint ou que la date limite est passée, un gagnant est **tiré au sort de façon
vérifiable** et reçoit **toute la cagnotte**.

## 2. Objectifs et réponses du projet

| Objectif de la ville | Ce que BlockLucky apporte | Juré concerné |
|---|---|---|
| Transparence, confiance | Hasard Chainlink VRF prouvé ; code public vérifié sur Etherscan ; partie Transparence sur le site | DSI, Maire |
| Sécurité, fiabilité | Mairie sans pouvoir sur les fonds ni le résultat ; cagnotte jamais bloquée ; 43 tests, 100 % de couverture, Slither | DSI |
| Efficacité, passage à 10 000 joueurs | Coût en gas indépendant du nombre de joueurs | DSI |
| Facilité d'utilisation | Site mobile d'abord, en français sans jargon, chaque erreur expliquée, guide MetaMask | Responsable évènementiel |
| Éducatif | « Comment ça marche ? » en 3 étapes, journal en direct des achats et tirages | Maire, Responsable évènementiel |
| Innovation, image de la ville | Ambiance des fêtes, billet de tombola, annonce du gagnant avec confettis | Maire |
| Collaboration mairie et Epitech | Projet documenté, réutilisable d'une année sur l'autre (nouvelle loterie sans redéploiement) | Maire |

## 3. Périmètre

**Inclus :** contrat `BlockLucky.sol` sur Sepolia, tests, scripts de déploiement et de démo, interface web
(React) prête pour Vercel, documentation technique et dossier sécurité.

**Hors périmètre (pistes futures) :**
- argent réel : autorisation légale nécessaire (Code de la sécurité intérieure, art. L322-1 et suivants, ANJ) et audit externe ;
- vérification d'âge et d'identité : à l'inscription, hors blockchain ;
- application mobile native : le site fonctionne déjà dans le navigateur de l'application MetaMask ;
- réseau de « couche 2 » pour réduire les frais.

## 4. Règles de la loterie

| | Démo | Vrai évènement |
|---|---|---|
| Prix du ticket | 0,001 ETH | réglable |
| Tickets par portefeuille | 5 | réglable |
| Fin | 5 participants ou 10 minutes | 10 000 participants ou le 31/12 |
| Gain | 100 % de la cagnotte | 100 % de la cagnotte |
| Lancement du tirage | n'importe qui, une fois la vente finie | idem |
| Rôle de la mairie | ouvrir une loterie et fixer ses règles, rien d'autre | idem |

## 5. Organisation en phases

| Phase | Créneau | Contenu | Livrable | Statut |
|---|---|---|---|---|
| 0. Cadrage | H0 → H3 | Versions vérifiées, pièges identifiés | `docs/phase0-cadrage.md` | ✅ |
| 1. Environnement | H3 → H5 | Hardhat 2, configuration, `.env` protégé | `hardhat.config.js`, `.gitignore` | ✅ |
| 2. Contrat | H5 → H16 | Contrat complet, commenté, sécurisé | `contracts/BlockLucky.sol` | ✅ |
| 3. Tests | H16 → H21 | 43 tests, couverture, Slither, simulation | `test/`, `scripts/simulate.js` | ✅ |
| 4. Déploiement | H21 → H23 | Scripts, guide, souscription Chainlink | `scripts/deploy.js`, `docs/deploiement-sepolia.md` | 🟡 déploiement Sepolia à faire |
| 5. Interface | H23 → H33 | Site React mobile d'abord | `src/` (Next.js) | 🟡 testé en local, Sepolia et Vercel à faire |
| 6. Documentation | H33 → H40 | README, dossier sécurité | `README.md`, `docs/securite.md` | 🟡 adresse du contrat à ajouter |
| 7. Soutenance | H40 → H48 | Démo, plan B, questions du DSI | `docs/soutenance.md`, `npm run demo:locale` | 🟡 répétition sur Sepolia à faire |

Règle de travail : une phase ne commence que lorsque la précédente est validée, et chaque phase se
termine par un commit.

## 6. Architecture en bref

```
Habitant (téléphone ou ordinateur)
   │  MetaMask
   ▼
Site BlockLucky (React, Vercel) ──lecture──► nœud Sepolia (Alchemy)
   │  transactions
   ▼
Contrat BlockLucky (Sepolia) ──demande de hasard──► Chainlink VRF v2.5
   ▲                                                   │
   └────────── nombre aléatoire + preuve ◄─────────────┘
```

États du contrat : `CLOSED` (pas de loterie) → `OPEN` (vente) → `CALCULATING` (tirage en attente de
Chainlink) → `CLOSED` (gagnant payé, historique public).

## 7. Décisions importantes

| Décision | Raison |
|---|---|
| Chainlink `@chainlink/contracts` 1.4.0 et non 1.5.0 | La 1.5.0 ne compile pas avec Hardhat 2 (import OpenZeppelin « versionné ») |
| Ne pas hériter de `VRFConsumerBaseV2Plus` | Sa fonction `setCoordinator` aurait permis à la mairie de brancher un faux hasard et de choisir le gagnant |
| Adresse Chainlink fixée au déploiement | Personne ne peut la changer ensuite |
| Tickets rangés par loterie | Effacer une liste de 10 000 tickets dépasserait la capacité d'un bloc et bloquerait le contrat |
| Envoi des gains à gas limité, gains mis de côté en cas d'échec | Un gagnant malveillant ne peut pas bloquer la loterie |
| `retryDraw()` après 1 h | La cagnotte ne reste jamais bloquée si Chainlink ne répond pas |
| Vente fermée dès que le nombre de participants est atteint | Pas d'achats « hors délai » en attendant le tirage |
| Pas de mécanisme de mise à jour du contrat | Personne ne peut changer les règles en douce |

## 8. Risques et parades

| Risque | Probabilité | Parade |
|---|---|---|
| Configuration de Chainlink trop longue | Moyenne | Faux Chainlink en local pour les tests et la démo de secours ; guide pas à pas |
| Pas assez d'ETH ou de LINK de test | Moyenne | Plusieurs faucets, comptes remplis la veille, prix du ticket bas |
| Sepolia lent ou en panne le jour J | Faible | `npm run demo:locale` et vidéo de secours |
| Faille dans le contrat | Faible | Exigences de sécurité, 43 tests, attaques simulées, Slither |
| Chainlink ne répond pas pendant la démo | Faible | Solde LINK vérifié, `retryDraw`, vidéo de secours |
| Manque de temps pour l'interface | Écarté | Interface terminée et testée en local |

## 9. Indicateurs de réussite

- Contrat vérifié sur Etherscan et loterie de démo jouée de bout en bout sur Sepolia
- 100 % des tests au vert, couverture supérieure à 90 % (atteint : 100 %)
- Parcours d'achat réalisable sur téléphone en moins de 2 minutes par une personne qui découvre MetaMask
- Les trois jurés obtiennent une réponse claire à leurs questions (voir `docs/soutenance.md`)

## 10. Après le rush

1. Audit de sécurité externe avant toute utilisation avec de l'argent réel.
2. Démarches légales (ANJ) si la ville veut une vraie loterie dotée.
3. Étude d'un réseau de couche 2 pour réduire les frais des habitants.
4. Pagination de la liste des tickets dans l'interface pour 10 000 participants.
5. Clé de la mairie sur un portefeuille multi-signatures.
