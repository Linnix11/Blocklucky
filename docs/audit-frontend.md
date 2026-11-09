# BlockLucky : audit UX/UI du front-end

Site : https://block.axionstudio.fr · audit du 9 novembre 2026 · version en ligne après le commit `891f947`

- **Pages mesurées** (sans compte connecté, sans MetaMask) : `/`, `/connexion`, `/ville/new1`, `/ville/test`, `/admin`, `/mairie`, `/ville/inexistante`.
- **Écrans `/admin` et `/mairie` une fois connecté** : relus dans le code ([AdminPage.jsx](../src/views/AdminPage.jsx), [MairiePage.jsx](../src/views/MairiePage.jsx), [AdminPanel.jsx](../src/components/AdminPanel.jsx)). Ils n'ont pas été mesurés dans le navigateur, faute d'identifiants saisis.
- **Tailles d'écran** : mobile 375 × 812 (tactile) et ordinateur 1280 × 800.
- **Méthode** : sondes automatiques (contraste, cibles tactiles, noms accessibles, structure, liens, focus réel au clavier avec Tab), captures d'écran, puis relecture complète des textes.

## Résumé

| Gravité | Nombre |
|---|---|
| Majeur | 7 |
| Accessibilité | 2 |
| Remarque | 8 |

Rien ne bloque l'utilisation. Les bases sont solides : aucun échec de contraste, une marque de focus très visible, une structure de titres propre et aucune erreur dans la console sur les 14 chargements.

Le principal défaut est le parcours de l'habitant. Le panneau « Mes tickets » se termine en impasse, et la connexion d'un habitant le renvoie sur l'accueil au lieu de la page de sa ville. Plusieurs textes ne collent plus au produit : la souscription en « LINK », l'annonce d'un tirage alors qu'aucun ticket n'a été vendu, et le nom technique d'un événement affiché tel quel.

## Constats

### 01 · Majeur · `/ville/<nom>` : le panneau « Mes tickets » est une impasse

Un visiteur dont l'inscription n'est pas encore reconnue lit qu'il faut se connecter, mais le panneau ne propose ni lien vers `/connexion` ni bouton pour connecter le portefeuille. C'est exactement ce qui a fait croire, plus tôt aujourd'hui, que le bouton d'achat avait disparu.

```
Mes tickets
Réservé aux habitants inscrits par la mairie : connectez-vous avec votre mail,
ou avec le portefeuille déclaré à la mairie.
```

Dans [BuyTickets.jsx](../src/components/BuyTickets.jsx), le contrôle `!allowed` passe avant `!wallet.account`. Le bouton « Connecter mon portefeuille » du panneau n'apparaît donc jamais pour un visiteur pas encore reconnu, alors que c'est justement la connexion du portefeuille qui permet de le reconnaître.

**Correction :** quand `allowed` est faux, afficher deux actions dans le panneau : « Connecter mon portefeuille » si aucun compte n'est connecté, et un lien « Me connecter avec mon mail » vers `/connexion`. N'afficher le message « réservé » qu'une fois le portefeuille connecté et refusé.

### 02 · Majeur · `/connexion` : un habitant connecté atterrit sur l'accueil, pas sur sa ville

Après sa connexion, l'habitant doit retrouver sa ville dans la liste. La connexion ne le rapproche pas de l'achat.

```js
// src/views/LoginPage.jsx
const HOME_BY_ROLE = { admin: "/admin", mairie: "/mairie", participant: "/" };
```

**Correction :** faire renvoyer la ville de l'habitant par `/api/login` (ou `/api/me`) et rediriger vers `/ville/<slug>`. Mieux encore : accepter un paramètre `?retour=` pour revenir sur la page d'où vient l'utilisateur.

### 03 · Majeur · `/mairie` : le lien vers la souscription parle encore de LINK

Depuis le commit `b9a68e8`, Chainlink est payé en ETH. Une mairie qui suit ce libellé cherchera un solde LINK et conclura à tort que la souscription est vide.

```
Souscription Chainlink (LINK restants)      ← AdminPanel.jsx
```

**Correction :** écrire « Souscription Chainlink (solde en ETH) ».

### 04 · Majeur · `/ville/test` : un tirage est annoncé alors qu'aucun ticket n'a été vendu

La page promet que Chainlink va désigner un gagnant. Or, sans ticket vendu, le contrat ferme simplement la loterie (`RoundClosedWithoutWinner`).

```
Participants 0 sur 5 · Tickets vendus 0
Vente terminée — Le tirage peut être lancé
La vente est terminée
La mairie va lancer le tirage. Le gagnant est choisi par Chainlink […]
```

**Correction :** quand `tickets.length === 0`, afficher « Aucun ticket vendu : la mairie va clôturer cette loterie sans gagnant ». Côté mairie, renommer le bouton « Lancer le tirage » en « Clôturer la loterie » dans ce cas.

### 05 · Majeur · `/ville/<nom>` : un nom d'événement technique s'affiche dans « En direct »

Le fil d'activité est destiné au public, mais il affiche un nom de code anglais.

```
En direct
La loterie n° 1 est ouverte. preuve
OwnershipTransferred preuve
```

Dans [Transparency.jsx](../src/components/Transparency.jsx), la fonction `describe()` renvoie `event.name` brut pour tout événement non prévu.

**Correction :** ajouter `OwnershipTransferred` (« Le contrat a été confié à la mairie de la ville ») ou filtrer les événements inconnus, et ajouter les autres événements du contrat (VRF) au passage.

### 06 · Majeur · `/mairie` et `/admin` : les suppressions n'ont ni confirmation ni retour d'erreur

D'un simple clic, la mairie peut retirer un habitant sans confirmation. Si l'appel au serveur échoue, rien ne s'affiche : l'erreur part dans la console sans être traitée.

```js
// MairiePage.jsx
const remove = async (identifier) => {
  await api(`/mairie/participants/${encodeURIComponent(identifier)}`, { method: "DELETE" });
  await onChange();
};
```

La suppression d'une ville dans `AdminPage.jsx` demande bien une confirmation (`window.confirm`), mais n'a pas non plus de `try/catch`.

Dans le même écran, l'ajout manuel vide le champ même en cas d'erreur, parce que `send()` intercepte l'erreur puis se termine normalement : `send(manual).then(() => setManual(""))`. La mairie perd alors ce qu'elle avait tapé.

**Correction :** entourer les deux suppressions d'un `try/catch` qui affiche l'erreur dans le `status` existant, et ne vider le champ que si l'ajout a réussi. Pour le retrait d'un habitant, une annulation possible pendant quelques secondes est préférable à une boîte de confirmation.

### 07 · Majeur · `/` : l'accueil ne dit rien de l'état des loteries, et les villes de test sont publiques

Pour savoir où jouer, il faut ouvrir chaque ville une par une. La liste affiche aussi des données de test sur le site public.

```
EtherBay  Voir la loterie →
new1      Voir la loterie →
Test      Voir la loterie →
```

Les données sont en cause, pas le rendu : `/api/cities` renvoie bien `"name": "new1"` et `"name": "Test"`.

**Correction :**
- **Sur les cartes :** afficher l'état de chaque loterie (ouverte, fin dans X, cagnotte), soit lu sur la blockchain, soit mis en cache côté serveur.
- **Dans les données :** supprimer les villes de test depuis `/admin` avant la soutenance.

### 08 · Accessibilité · `/ville/<nom>` : la cible du lien retour est trop petite

Le lien « ← Toutes les villes » mesure **123 × 18 px**. Le critère WCAG 2.2 SC 2.5.8 (taille minimale de cible) demande 24 px, ou un espacement équivalent. Les liens « metamask.io » et « robinet Chainlink » du guide mesurent 21 px de haut.

**Correction :** `padding-block: 3px` minimum sur `.network-tag a`, ou `display: inline-block; min-height: 24px`.

### 09 · Accessibilité · Toutes les pages : le même titre d'onglet partout

Les 7 pages ont le titre `BlockLucky, la loterie des villes`. Le critère WCAG 2.2 SC 2.4.2 (page avec titre) demande un titre qui décrit le sujet de la page. Les onglets, les favoris et les lecteurs d'écran ne distinguent pas `/ville/new1` de `/admin`.

**Correction :** définir `metadata` dans chaque `page.jsx`, ou faire `document.title = \`Loterie de ${city.name} · BlockLucky\`` côté client pour les pages de ville.

### 10 · Remarque · `/ville/inexistante` : « Ville introuvable » est renvoyée avec le code 200

La page d'erreur est servie comme une page normale (code 200 au lieu de 404). Les moteurs de recherche et les outils de supervision la prennent pour une vraie page.

**Correction :** appeler `notFound()` de Next.js.

### 11 · Remarque · `/ville/<nom>` : « Installer MetaMask » apparaît deux fois sur le premier écran

Sur mobile, les 400 premiers pixels montrent un bouton dans l'en-tête et un deuxième dans le bandeau, avec exactement le même libellé et la même destination.

**Correction :** garder le bandeau, qui explique pourquoi installer MetaMask, et retirer le bouton de l'en-tête quand le bandeau est visible.

### 12 · Remarque · Accords et pluriels

```
Les 0 ticket en jeu                  ← Transparency.jsx
${added} habitant(s) importé(s).     ← MairiePage.jsx
```

**Correction :** écrire « Aucun ticket en jeu » pour zéro, et utiliser `Intl.PluralRules("fr")` (en français, 0 et 1 prennent le singulier) pour les autres cas.

### 13 · Remarque · `/ville/<nom>` : le numéro de la loterie apparaît deux fois, sous deux formes

Le billet affiche à la fois `Loterie des fêtes n° 1` et `N° 000001`. Le numéro complété de zéros fait billet de tombola, mais en double il ressemble à deux identifiants différents.

### 14 · Remarque · Tout le site s'affiche uniquement côté navigateur

Dans `Shell.jsx`, `{mounted ? children : <main className="page" />}` fait que le HTML envoyé par le serveur est vide. Au premier chargement de l'accueil sur mobile, le premier affichage arrive au bout de **2 028 ms**, contre 48 à 132 ms une fois en cache.

**Correction :** afficher l'accueil et la liste des villes côté serveur. Seules les parties liées au portefeuille ont besoin du navigateur.

### 15 · Remarque · Trop de texte en gras

Sur le premier écran de `/ville/new1`, **57 %** des blocs de texte sont en semi-gras ou plus (8 sur 14). Le gras ne marque plus la hiérarchie.

On compte aussi **12 tailles de police** (17 px, 15,2 px, 17,6 px, 13,6 px…) et **16 valeurs d'espacement**, au-dessus d'une échelle typique.

### 16 · Remarque · Ponctuation des textes d'aide

Sur 11 textes d'aide, 9 finissent par un point et 2 n'en ont pas. Il faut choisir une règle et l'appliquer partout.

### 17 · Remarque · Pas de lien d'évitement

Il n'y a pas de lien « Aller au contenu ». Les zones de navigation (`main`, `nav`, `header`, `footer`) sont présentes, donc le critère WCAG 2.4.1 est respecté, mais un lien d'évitement aiderait au clavier sur la page de ville, longue de 4 écrans sur mobile.

## Ce qui fonctionne

- **Contraste :** 0 échec sur 60 éléments mesurés (`/ville/new1`), 12 (`/`) et 9 (`/connexion`), aux deux tailles d'écran.
- **Focus clavier :** contour de 3 px `rgb(246,185,59)` décalé de 3 px. Il est déclenché par de vrais appuis sur Tab et contraste à 9,14:1 et 10,14:1 avec le fond, pour 3:1 exigé par le critère WCAG 1.4.11. Il est cohérent sur les liens, les champs, les boutons et `summary`.
- **Formulaire de connexion :** les champs ont un label qui les entoure, `autocomplete="email"` et `autocomplete="current-password"`, et `required`.
- **Mise en page :** aucun débordement horizontal à 375 px, sur toutes les pages.
- **Structure :** un seul `h1` par page, aucun niveau de titre sauté, `lang="fr"`, zones de navigation présentes.
- **Stabilité :** aucune erreur ni avertissement dans la console sur les 14 chargements, et 5 liens de navigation sur 5 répondent en 200.
- **Suppression d'une ville :** la confirmation explique la conséquence (« Le contrat reste sur la blockchain »).
- **Contenu :** les textes pédagogiques (« Comment ça marche ? », « Transparence ») sont clairs et sans jargon.

## Par où commencer

Les corrections sont classées selon leur impact rapporté à l'effort :

1. **03 :** remplacer « LINK » par « ETH » (une ligne).
2. **05 :** libellé pour `OwnershipTransferred` (une ligne).
3. **01 :** actions dans le panneau « Mes tickets » (environ 15 lignes, débloque le parcours principal).
4. **04 :** message « aucun ticket vendu » (quelques lignes, deux composants).
5. **06 :** `try/catch` et retour d'erreur sur les suppressions et l'ajout.
6. **02 :** redirection de l'habitant vers sa ville (API et page de connexion).
7. **09, 10, 08 :** titres de page, `notFound()`, taille du lien retour.
8. **07 :** nettoyage des villes de test, puis état des loteries sur l'accueil.
9. **12 à 17 :** finitions de texte et de style.
