/**
 * Designs proposés aux mairies pour la page publique de leur loterie.
 * Partagé par le site (choix, aperçu) et le serveur (validation). Les couleurs sont dans themes.css.
 * `swatches` : fond, couleur d'action, couleur d'accent, pour l'aperçu dans l'espace mairie.
 */
export const THEMES = [
  {
    id: "sobre",
    name: "Sobre",
    description: "Le style service public : clair, neutre et très lisible. Convient à toutes les villes.",
    swatches: ["#f4f6f9", "#1f4e8c", "#a3242f"],
  },
  {
    id: "fetes",
    name: "Fêtes de fin d'année",
    description: "Vert sapin et rouge des fêtes, pour une loterie de décembre.",
    swatches: ["#f6f3ec", "#1d5c3f", "#b3262e"],
  },
  {
    id: "littoral",
    name: "Littoral",
    description: "Bleu océan et sable, pour les villes de bord de mer.",
    swatches: ["#eef6f7", "#0b6b77", "#b5651d"],
  },
  {
    id: "patrimoine",
    name: "Patrimoine",
    description: "Titres à empattements et bordeaux, pour les villes historiques.",
    swatches: ["#f5f2ee", "#7a1f2b", "#8a6a2f"],
  },
  {
    id: "nuit",
    name: "Nuit",
    description: "Thème sombre, agréable le soir et sur les écrans d'affichage.",
    swatches: ["#0f1626", "#8cb8ff", "#f2b84b"],
  },
];

export const DEFAULT_THEME = "sobre";

export const THEME_IDS = THEMES.map((t) => t.id);

/** Design valide, ou celui par défaut. */
export function themeOrDefault(id) {
  return THEME_IDS.includes(id) ? id : DEFAULT_THEME;
}
