# Design — BlockLucky

Le système de design de BlockLucky. Toute modification d'une page part de ce fichier.
Les valeurs exactes vivent dans [`src/tokens.css`](src/tokens.css) ; ce fichier dit comment s'en servir.
Version 2 (9 novembre 2026) : « machine à sous », validée sur maquette cliquable. Remplace le registre « fête populaire ».

## Intention

Donner **envie de jouer**, tout en restant **évident pour un débutant** qui n'a jamais touché à une blockchain.
L'univers est celui d'une salle de jeux le soir : ampoules, rouleaux, jetons, levier.
Le jeu porte le décor ; les textes, eux, restent simples, en français courant, sans jargon.

- **Public** : les habitants d'une ville (souvent novices), leur mairie, un administrateur.
- **Action principale** : prendre des tickets pour la loterie de sa ville, puis suivre le tirage.
- **Anti-objectifs** : un site qui ressemble à un vrai casino d'argent (rappeler partout que les ethers sont fictifs),
  un décor qui cache l'action, des métaphores qui rendent le sens flou (« jeton » est toujours expliqué : 1 jeton = 1 ticket).

## Familles de pages

| Type | Pages | Forme | Décor |
|---|---|---|---|
| Accueil | `/` | Titre, puis une ligne par ville ; la ville en vente s'allume | Ampoules, bandeau défilant |
| Loterie | `/ville/<nom>` | La **machine** (cagnotte, 3 rouleaux, rampe de lampes, levier) à gauche ; l'achat, l'explication et le direct à droite ; la transparence en dessous | Complet |
| Formulaire | `/connexion` | Une seule carte | Ampoules et bandeau seulement |
| Outils | `/admin`, `/mairie` | Panneaux simples | Ampoules et bandeau seulement |

Sur téléphone, la page de loterie s'empile dans l'ordre : machine, achat (avant la machine quand la vente est ouverte), explication, direct, transparence.

## Couleurs

| Variable | Rôle |
|---|---|
| `--color-night` | Fond, rouge très sombre |
| `--color-panel`, `--color-panel-2`, `--color-line` | Cartes, cases, filets |
| `--color-cream` | Texte principal, fond des rouleaux |
| `--color-muted` | Texte secondaire |
| `--color-gold`, `--color-gold-deep` | Cadres de la machine, ampoules, focus, chiffres clés |
| `--color-red`, `--color-red-deep` | Bouton principal (levier), symboles des rouleaux |
| `--color-mint` | Uniquement l'état « vente ouverte » et les chances de gagner |

## Typographie

- **Bungee** : titres, chiffres, boutons, enseignes. Capitales natives.
- **Bungee Shade** : le logo seulement.
- **Atkinson Hyperlegible** : tout le texte courant, les aides, les formulaires.
- Les trois polices viennent de Google Fonts et couvrent les accents français.

## Éléments signature

1. **Ampoules** en haut de page qui « courent » (or), fixes si l'utilisateur demande moins d'animations.
2. **Machine** : cadre or épais, ombre portée or foncé, enseigne « Loterie n° X » en haut.
3. **Trois rouleaux** crème : joueurs, temps restant, mes tickets (tickets vendus si pas connecté). Ils tournent quand un chiffre change.
4. **Rampe de lampes** : une lampe par place (participants sur maximum).
5. **Levier** décoratif sur le côté de la machine, qui s'abaisse au moment de l'achat.
6. **Jetons** de casino ronds, 5 couleurs, pour choisir le nombre de tickets.
7. **Bouton levier** rouge en relief : « Tirer le levier · 0,002 ETH ».
8. **Bandeau or** défilant en pied de page.

## Mouvement

- Easing `--ease-out` `cubic-bezier(0.22, 1, 0.36, 1)`. Pas de rebond sur les boutons.
- Animations autorisées : ampoules, point « vente ouverte », rouleaux au changement de valeur, levier, bandeau.
- `prefers-reduced-motion: reduce` : tout est figé.

## Micro-interactions

- Bouton levier : il s'enfonce de 5 px au clic.
- Jeton choisi : soulevé et entouré d'or (`aria-pressed`).
- Les chances de gagner s'affichent **avant** l'achat et se mettent à jour avec le nombre de jetons.
- Focus : contour or de 3 px, instantané ; contour crème sur les éléments or ou rouges.
- Retrait d'un habitant : immédiat avec « Annuler » ; suppression d'une ville : confirmation.

## Textes

- Vouvoiement partout, comme le reste du site et les messages d'erreur (« Combien de jetons ? », « Vos chances »).
- Toujours rappeler « ethers fictifs, aucun vrai argent » près de l'achat.
- Pas de chiffres inventés : tout ce qui est affiché vient du contrat ou de l'API.

## Exports

Les variables sont dans [`src/tokens.css`](src/tokens.css), importé par `src/app/layout.jsx` avant `src/styles.css`.
