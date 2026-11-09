# BlockLucky : audit UX/UI après la refonte

Site : https://block.axionstudio.fr · 9 novembre 2026 · version en ligne du commit `189ebe8` (refonte Hallmark)

- **Pages mesurées** (sans compte connecté, sans MetaMask) : `/`, `/connexion`, `/ville/new1`, `/ville/test`, `/ville/etherbay`, `/admin`, `/mairie`, `/ville/inexistante`.
- **Tailles d'écran** : mobile 375 × 812 (tactile) et ordinateur 1280 × 800.
- **Méthode** :
  - **Sondes automatiques :** contraste, cibles tactiles, noms accessibles, structure, liens, typographie.
  - **Focus :** mesuré avec de vrais appuis sur Tab (Tab réel), sur 21 éléments.
  - **Relecture et données :** captures d'écran, relecture complète des textes, et comparaison avec l'API (`/api/cities`) et le contrat.
- **Système de référence** : [design.md](../design.md) pour le visuel, WCAG 2.2 pour l'accessibilité.
- **Audit précédent** : [audit-frontend.md](audit-frontend.md). Le suivi des 17 constats est en fin de document.

## Résumé

| Gravité | Nombre |
|---|---|
| Majeur | 4 |
| Accessibilité | 2 |
| Remarque | 5 |

La refonte tient ses promesses techniques :
- **Contraste :** aucun échec sur 578 éléments mesurés.
- **Focus :** le contour est visible partout, de 9,14:1 à 10,14:1.
- **Mise en page :** aucun débordement horizontal.
- **Console :** aucune erreur sur les 16 chargements.

Il reste quatre défauts de sens, que seule la relecture voit :
- **Accueil et page de ville :** ils se contredisent sur les loteries sans ticket.
- **Billet :** le nom « EtherBay » y est écrit en dur pour toutes les villes.
- **Mobile :** l'achat est loin sous le premier écran.
- **Accueil :** aucune loterie n'est ouverte en ce moment, donc rien n'est achetable.

## Constats

### 01 · Majeur · `/` et `/ville/<nom>` : l'accueil annonce un tirage que la page de la ville dément

Sur l'accueil, EtherBay et Test sont annoncées « tirage à venir ». En ouvrant la ville, on lit qu'il n'y aura pas de gagnant. Le visiteur reçoit deux versions de la même information.

```
Accueil      ETHERBAY | Vente terminée, tirage à venir | 0 ETH
/ville/etherbay  PARTICIPANTS 0 sur 5 · TICKETS VENDUS 0
                 « Aucun ticket n'a été vendu : la mairie va clôturer cette loterie sans gagnant »
```

**Source :** `describeStatus()` dans [HomePage.jsx](../src/views/HomePage.jsx) ne lit que `state`, `roundId`, `endTime`, `getPot` et `canDraw`, et jamais le nombre de tickets. La page de la ville, elle, s'appuie sur `tickets.length`. Le défaut est dans l'interface, pas dans les données.

**Correction :** lire aussi `participantsCount()` sur l'accueil. S'il vaut 0 et que la vente est finie, afficher « Vente terminée, aucun ticket vendu ».

### 02 · Majeur · `/ville/<nom>` : le billet affiche « EtherBay » pour toutes les villes

Pour toute ville qui n'a pas encore ouvert sa première loterie, le billet porte le nom d'une autre ville.

```js
// src/components/LotteryStats.jsx:51
{noRoundYet ? "Loterie des fêtes d'EtherBay" : `Loterie des fêtes n° ${data.roundId}`}
```

Je ne l'ai pas vu à l'écran, car les 3 villes ont toutes une loterie n° 1. Mais la première ville créée après la soutenance l'affichera.

**Correction :** passer le nom de la ville au composant, ou écrire « Première loterie bientôt ».

### 03 · Majeur · `/ville/<nom>` sur mobile : l'achat arrive après 1,6 écran

Sur un téléphone, le visiteur voit la cagnotte, mais pas l'endroit où acheter.

```
375 × 812 : en-tête 12–124 px · titre 204–281 · bandeau MetaMask 375–575
            billet 599–1120 · « Mes tickets » 1336–1459   (premier écran : 0–812)
```

L'ordre du DOM place le panneau d'achat après le billet et le panneau de tirage.

**Correction :** sur mobile, placer « Mes tickets » juste après le titre quand la vente est ouverte, par exemple avec `order: -1` dans `.play-grid`. Autre option : ajouter sous le billet un bouton « Acheter un ticket » qui fait défiler jusqu'au panneau.

### 04 · Majeur · `/` : aucune loterie n'est ouverte, et l'accueil ne propose rien d'autre

Les trois villes sont dans le même état. Un visiteur qui arrive aujourd'hui ne peut acheter nulle part.

```
ETHERBAY Vente terminée, tirage à venir · NEW1 Vente terminée, tirage à venir · TEST Vente terminée, tirage à venir
```

Ce sont les données qui sont en cause, pas le code : le contrat de chaque ville renvoie `canDraw = true`.

**Correction :**
- **Avant la soutenance :** tirer ou clôturer chaque loterie depuis `/mairie`, puis en ouvrir une nouvelle.
- **Dans l'interface :** si aucune ville n'a de vente ouverte, afficher sur l'accueil une phrase comme « Aucune vente en cours. La prochaine loterie sera annoncée ici. »

### 05 · Accessibilité · Toutes les pages : le même titre d'onglet

Les 8 pages s'appellent toutes `BlockLucky, la loterie des villes`. Le critère WCAG 2.2 SC 2.4.2 (page avec titre) n'est pas respecté. Ce constat vient de l'audit précédent (n° 09) et reste ouvert.

**Correction :** `document.title = \`Loterie de ${city.name} · BlockLucky\`` dans `CityPage`, et l'équivalent pour Connexion, Administration et Mairie.

### 06 · Accessibilité · `/admin`, `/mairie` sans compte, `/ville/inexistante` : pas de titre `h1`

Ces écrans portent leur titre en `h2` (« ACCÈS RÉSERVÉ », « VILLE INTROUVABLE »), et la sonde mesure `h1Count: 0`. Les lecteurs d'écran ne trouvent pas de titre principal. Les critères concernés sont 1.3.1 (information et relations) et 2.4.6 (en-têtes et étiquettes).

**Correction :** passer ces deux titres en `h1`, dans `Guard` ([Shell.jsx](../src/components/Shell.jsx)) et [page.jsx](../src/app/ville/%5Bslug%5D/page.jsx).

### 07 · Remarque · `/ville/<nom>` : « de EtherBay » au lieu de « d'EtherBay »

```
LA LOTERIE DES FÊTES DE ETHERBAY
```

Le titre est construit par simple concaténation (`La loterie des fêtes de {city.name}`). Devant une voyelle, le français élide.

**Correction :** `/^[aeiouyéèêàâîïôûh]/i.test(name) ? "d'" : "de "`.

### 08 · Remarque · `/ville/<nom>` : « Les 0 ticket en jeu »

Ce constat vient de l'audit précédent (n° 12) et reste ouvert. Il apparaît sur `/ville/test` et `/ville/etherbay`.

**Correction :** « Aucun ticket en jeu » pour zéro.

### 09 · Remarque · `/ville/inexistante` : la page est renvoyée avec le code 200

Ce constat vient de l'audit précédent (n° 10) et reste ouvert. Les 8 routes répondent 200, y compris la ville inconnue.

### 10 · Remarque · Le gras ne hiérarchise presque plus

Après la refonte, la part de texte en gras ou plus sur le premier écran est de **93 %** sur l'accueil mobile, **83 %** sur une page de ville mobile et **75 %** sur ordinateur. Avant la refonte, elle était de 57 %.

Capitales et graisse 800 sont voulues par le registre « fête populaire » ([design.md](../design.md)). Mais quand presque tout est en gras, le gras ne sert plus à guider l'œil.

**Correction :** remettre en graisse normale les petites étiquettes (`.masthead-line`, `.city-status`, `.fact dt`, `.stub-title`). Garder le gras pour les titres, les montants et les boutons.

### 11 · Remarque · Le numéro de loterie apparaît encore deux fois

`LOTERIE DES FÊTES N° 1` et `N° 000001` figurent sur le même billet. Ce constat vient de l'audit précédent (n° 13).

## Ce qui fonctionne

- **Contraste :** 0 échec sur 578 mesures, réparties sur 8 routes et 2 tailles d'écran. Exemples : `/ville/new1` 70 sur 70 et `/` 25 sur 25. Le texte crème sur l'aplat lie-de-vin et l'encre sur l'aplat or passent.
- **Focus :** sur 21 éléments parcourus au clavier, tous ont un contour visible.
  - **Sur fond nuit :** contour or à 10,14:1.
  - **Sur panneau :** contour or à 9,14:1.
  - **Dans l'aplat or :** contour encre à 9,47:1.
  - Le seuil exigé est de 3:1.
- **Cibles tactiles :** le lien « ← Toutes les villes » est passé de 18 px à 32 px de haut. Il ne reste sous 24 px que des liens à l'intérieur d'une phrase (« metamask.io », « robinet Chainlink »), qui relèvent de l'exception « dans le texte » du critère 2.5.8.
- **Mise en page :** aucun débordement horizontal sur les 16 chargements.
- **Navigation :** 5 liens sur 5 de la navigation répondent 200.
- **Formulaire de connexion :** les champs ont des labels et `autocomplete="email"` / `current-password`.
- **Vitesse :** le premier affichage arrive entre 68 et 228 ms. Avant la refonte, il fallait 2 028 ms à froid sur l'accueil mobile, mais cette ancienne mesure n'avait pas été faite cache vidé.
- **Textes :** la page de ville dit juste quand aucun ticket n'est vendu, le fil « En direct » est entièrement en français, et « Installer MetaMask » n'apparaît plus qu'une fois sur la page.

## Suivi de l'audit précédent

| N° | Constat | État |
|---|---|---|
| 01 | « Mes tickets » sans action | Corrigé |
| 02 | Habitant renvoyé sur l'accueil après connexion | Ouvert |
| 03 | « LINK restants » côté mairie | Corrigé |
| 04 | Tirage annoncé sans ticket vendu | Corrigé sur la page de ville, réapparu sur l'accueil (n° 01 ci-dessus) |
| 05 | `OwnershipTransferred` brut | Corrigé |
| 06 | Suppressions sans retour d'erreur | Corrigé (et « Annuler » pour un habitant) |
| 07 | Accueil sans état des loteries | Corrigé |
| 08 | Lien retour de 18 px | Corrigé (32 px) |
| 09 | Même titre d'onglet partout | Ouvert (n° 05) |
| 10 | Page 404 renvoyée en 200 | Ouvert (n° 09) |
| 11 | « Installer MetaMask » en double | Corrigé |
| 12 | « Les 0 ticket en jeu » | Ouvert (n° 08) |
| 13 | Numéro de loterie en double | Ouvert (n° 11) |
| 14 | Site affiché uniquement côté navigateur | Ouvert, mais impact mesuré faible |
| 15 | Trop de gras | Aggravé par la refonte (n° 10) |
| 16 | Ponctuation des aides | Ouvert |
| 17 | Pas de lien d'évitement | Ouvert |

## Par où commencer

Les corrections sont classées selon leur impact rapporté à l'effort :

1. **04 :** ouvrir une loterie avant la soutenance, sans toucher au code (action dans `/mairie`).
2. **02 :** une ligne dans `LotteryStats.jsx`.
3. **01 :** lire `participantsCount()` sur l'accueil (quelques lignes).
4. **07 et 08 :** élision et « Aucun ticket en jeu » (une ligne chacun).
5. **06 :** deux `h2` à passer en `h1`.
6. **05 :** titres d'onglet par page.
7. **03 :** remonter l'achat sur mobile.
8. **10, 09, 11 :** finitions.
