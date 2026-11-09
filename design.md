# Design — BlockLucky

Le système de design figé de BlockLucky. Toute modification d'une page part de ce fichier.
On ne le régénère pas page par page : on le complète ou on l'amende quand le système doit évoluer.
Les valeurs exactes vivent dans [`src/tokens.css`](src/tokens.css) ; ce fichier dit comment s'en servir.

## Genre

Éditorial, registre « fête populaire » : une affiche de tombola de village, la nuit.
Inspiré du thème Carnival de Hallmark (aplats francs, ornements typographiques, ombres nettes),
transposé sur le fond prune de la marque au lieu d'un papier clair.

## Public, usage, ton

- **Public** : les habitants d'une ville (souvent novices en blockchain), leur mairie, un administrateur.
- **Usage principal** : acheter un ticket pour la loterie de sa ville, puis suivre le tirage.
- **Ton** : fête populaire. Chaleureux, franc, lisible ; jamais « fintech ».

## Familles de pages

| Type | Pages | Forme | Décor autorisé |
|---|---|---|---|
| Public, accueil | `/` | Marquee Hero : grand titre d'affiche, puis l'index des villes en lignes | Ornements, aplat or au survol |
| Public, loterie | `/ville/<nom>` | Stat-Led : la cagnotte en très grand chiffre sur le billet, puis les sections | Billet, aplat or (« Comment ça marche »), aplat lie-de-vin (tirage), ornements |
| Formulaire | `/connexion` | Une seule affiche (carte avec ombre nette) | Ombre nette, aucun autre décor |
| Outils | `/admin`, `/mairie` | Deux colonnes inégales, panneaux plats | Aucun : la fonction porte la page |

## Thème

| Variable | Valeur | Rôle |
|---|---|---|
| `--color-night` | `oklch(21.2% 0.058 295)` | Fond (ciel d'hiver) |
| `--color-night-2` | `oklch(25.4% 0.070 296)` | Panneaux |
| `--color-night-3` | `oklch(31.1% 0.091 292)` | Filets, bordures, champs |
| `--color-snow` | `oklch(95.7% 0.016 310)` | Texte principal |
| `--color-muted` | `oklch(76.3% 0.055 304)` | Texte secondaire (sur fond nuit seulement) |
| `--color-paper` | `oklch(96.8% 0.033 84)` | Papier du billet |
| `--color-ink` | `oklch(23.8% 0.031 46)` | Encre sur papier et sur or |
| `--color-ink-soft` | `oklch(44% 0.057 56)` | Encre secondaire sur papier |
| `--color-gold` | `oklch(82.1% 0.151 81)` | Accent 1 : actions, aplats, ornements |
| `--color-wine` | `oklch(50.6% 0.176 17)` | Accent 2 : tirage, ombres du billet, aplats |
| `--color-fir` | `oklch(56.9% 0.119 155)` | Succès |
| `--color-danger` | `oklch(75.8% 0.145 29)` | Erreurs (texte sur fond nuit) |

Règles de couleur :

- **Duo-ton** : un bloc est rempli d'or **ou** de lie-de-vin, jamais des deux.
- **Lie-de-vin jamais en texte sur fond nuit** (contraste insuffisant) : il sert d'aplat (texte crème dessus) ou d'ombre.
- **Pas de blanc ni de noir purs** : le crème (`--color-on-wine`, `--color-snow`) et l'encre teintée les remplacent.
- **Pas de dégradé** décoratif, pas d'ombre floue.

## Typographie

- **Titres** : Bricolage Grotesque 800, en capitales (`text-transform: uppercase`), interlettrage serré
  (`-0.01em` pour le titre de page, `0.02em` pour les titres de section). Toujours romain, jamais d'italique.
- **Texte** : Atkinson Hyperlegible 400 / 700, en casse normale, 17 px de base.
- **Mono** : police système (`ui-monospace`) pour les adresses de contrat.
- **Chiffres** : `tabular-nums` partout où un nombre peut changer (cagnotte, compte à rebours, listes).
- **Taille des titres de page** : `--text-display` jusqu'à 50 caractères ; au-delà, `--text-display-s`.

## Espacements

Échelle de 4 px nommée (`--space-3xs` 4 px → `--space-3xl` 112 px). Les pages utilisent les noms, jamais de valeurs brutes.
Les sections publiques ne sont pas toutes espacées pareil : l'aplat « Comment ça marche » respire plus que la transparence.

## Signature (à garder sur les pages publiques)

1. **Billet de tombola** : papier crème, talon or perforé, ombre nette lie-de-vin.
2. **Ombres nettes** : `4px 4px 0` (ou `6px 6px 0` pour le billet), jamais floues.
3. **Aplats qui débordent** de la marge comme des affiches collées.
4. **Ornements typographiques** : `◆` devant les titres de section, `✱ ✱ ✱` comme séparateur, `❋` comme puce.
5. **Filets pleins de 2 px**, pas de filets fins.
6. **Bandeau défilant** en pied de page, figé si l'utilisateur demande moins d'animations.
7. **Guirlande** (points or et lie-de-vin) en haut de chaque page.

## Animation

- Easings : `--ease-out` `cubic-bezier(0.22, 1, 0.36, 1)`, `--ease-in-out` `cubic-bezier(0.65, 0, 0.35, 1)`.
- Une seule animation continue : le bandeau du pied de page. Le reste ne bouge pas.
- Transitions courtes (`--dur-short` 150 ms) sur la couleur et le transform uniquement.
- `prefers-reduced-motion: reduce` : bandeau figé, transitions coupées.

## Micro-interactions

- **Succès silencieux** quand le résultat se voit ; message seulement pour les transactions (asynchrones).
- **Annuler plutôt que confirmer** pour une action réversible (retrait d'un habitant) ;
  confirmation seulement pour l'irréversible (suppression d'une ville).
- **Focus** : contour or de 3 px, instantané, jamais animé ; contour encre sur les aplats or.
- **Bouton pressé** : il descend de 2 px et son ombre se réduit d'autant.

## Boutons

- **Principal** : aplat or, texte encre, rayon 6 px, ombre nette `3px 3px 0` couleur `--color-shadow`.
- **Tirage** : aplat lie-de-vin, texte crème, même forme.
- **Secondaire** : contour 2 px `--color-night-3`, texte neige ; contour or au survol.
- Libellés courts (verbe d'abord), jamais sur deux lignes.

## Ce que toutes les pages partagent

La guirlande, l'en-tête façon journal, le bandeau de pied de page, les couleurs, les deux polices,
la forme des boutons, les champs de formulaire et le contour de focus.

## Ce que les pages peuvent varier

La forme (selon la famille ci-dessus) et la présence d'aplats colorés, uniquement sur les pages publiques.

## Exports

### tokens.css

Voir [`src/tokens.css`](src/tokens.css), importé par `src/app/layout.jsx` avant `src/styles.css`.

### Tailwind v4 `@theme` (si le projet passe à Tailwind)

```css
@theme {
  --color-night: oklch(21.2% 0.058 295);
  --color-snow: oklch(95.7% 0.016 310);
  --color-paper: oklch(96.8% 0.033 84);
  --color-ink: oklch(23.8% 0.031 46);
  --color-gold: oklch(82.1% 0.151 81);
  --color-wine: oklch(50.6% 0.176 17);
  --font-display: "Bricolage Grotesque", "Trebuchet MS", sans-serif;
  --font-body: "Atkinson Hyperlegible", "Segoe UI", system-ui, sans-serif;
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
}
```

### DTCG `tokens.json`

```json
{
  "color": {
    "night": { "$value": "oklch(21.2% 0.058 295)", "$type": "color" },
    "snow": { "$value": "oklch(95.7% 0.016 310)", "$type": "color" },
    "paper": { "$value": "oklch(96.8% 0.033 84)", "$type": "color" },
    "ink": { "$value": "oklch(23.8% 0.031 46)", "$type": "color" },
    "gold": { "$value": "oklch(82.1% 0.151 81)", "$type": "color" },
    "wine": { "$value": "oklch(50.6% 0.176 17)", "$type": "color" }
  },
  "font": {
    "display": { "$value": "Bricolage Grotesque", "$type": "fontFamily" },
    "body": { "$value": "Atkinson Hyperlegible", "$type": "fontFamily" }
  }
}
```
