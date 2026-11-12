/**
 * Design personnalisé d'une ville (généré par Gemini à partir de la description de la mairie).
 *
 * Sécurité : l'IA ne produit JAMAIS de CSS ni de code. Elle propose seulement quelques réglages
 * (5 couleurs, une police parmi celles du site, un style d'angles, un style d'en-tête). Ce module :
 *  - valide et nettoie ces réglages (normalizeCustomTheme), côté serveur avant tout enregistrement ;
 *  - corrige les couleurs pour garantir des contrastes lisibles (WCAG : ≥ 7:1 pour le texte, ≥ 4,5:1 sinon) ;
 *  - calcule toutes les variables CSS du site à partir de ces réglages (customThemeVars).
 * Utilisé à l'identique par le serveur (validation) et par le navigateur (affichage).
 */

export const CUSTOM_THEME = "custom";

export const FONTS = {
  "Public Sans": "var(--font-public-sans), system-ui, sans-serif",
  Fraunces: "var(--font-fraunces), Georgia, serif",
  "Source Serif 4": "var(--font-source-serif), Georgia, serif",
};

const CORNERS = {
  net: { sm: "2px", md: "3px", lg: "4px" },
  standard: { sm: "6px", md: "10px", lg: "14px" },
  arrondi: { sm: "8px", md: "14px", lg: "20px" },
};

const HEADERS = ["clair", "couleur"];

// ---------- Couleurs ----------

const HEX = /^#[0-9a-f]{6}$/;

function parseHex(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

function toHex(rgb) {
  return `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, "0")).join("")}`;
}

/** Mélange a et b : t = 0 donne a, t = 1 donne b. */
export function mix(a, b, t) {
  const [x, y] = [parseHex(a), parseHex(b)];
  return toHex(x.map((c, i) => c + (y[i] - c) * t));
}

function luminance(hex) {
  const lin = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = parseHex(hex).map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Rapport de contraste WCAG entre deux couleurs. */
export function contrast(a, b) {
  const [la, lb] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (la + 0.05) / (lb + 0.05);
}

/** Assombrit ou éclaircit `fg` (dans le sens qui aide) jusqu'au contraste demandé sur chaque fond. */
function ensureContrast(fg, backgrounds, min) {
  const darker = luminance(backgrounds[0]) > 0.4;
  const target = darker ? "#000000" : "#ffffff";
  let color = fg;
  for (let t = 0; t <= 1.001 && backgrounds.some((bg) => contrast(color, bg) < min); t += 0.04) {
    color = mix(fg, target, t);
  }
  return color;
}

function cleanColor(value, fallback) {
  const hex = String(value ?? "").trim().toLowerCase();
  return HEX.test(hex) ? hex : fallback;
}

function cleanText(value, max) {
  return String(value ?? "")
    .replace(/[<>{}\u0000-\u001f]/g, "")
    .trim()
    .slice(0, max);
}

/**
 * Valide et corrige un design proposé (par l'IA ou renvoyé par le navigateur).
 * Renvoie un objet sûr, avec des contrastes garantis, quelle que soit l'entrée.
 */
export function normalizeCustomTheme(raw = {}) {
  const colors = raw.colors ?? {};
  const bg = cleanColor(colors.bg, "#f4f6f9");
  const dark = luminance(bg) < 0.18;
  let surface = cleanColor(colors.surface, dark ? "#172036" : "#ffffff");
  // La surface (cartes) doit rester proche du fond en luminosité, pour que le texte soit lisible sur les deux.
  if (Math.abs(luminance(surface) - luminance(bg)) > 0.35) surface = mix(bg, "#ffffff", dark ? 0.06 : 0.6);

  const ink = ensureContrast(cleanColor(colors.ink, dark ? "#e8edf6" : "#14213d"), [surface, bg], 7);
  // 5,2 et non 4,5 : la couleur d'action est aussi posée sur un fond teinté (primary-wash), un peu plus foncé.
  const primary = ensureContrast(cleanColor(colors.primary, "#1f4e8c"), [surface, bg], 5.2);
  const festive = ensureContrast(cleanColor(colors.festive, "#a3242f"), [surface, bg], 4.5);

  return {
    name: cleanText(raw.name, 40) || "Design personnalisé",
    description: cleanText(raw.description, 160),
    colors: { bg, surface, ink, primary, festive },
    font: Object.hasOwn(FONTS, raw.font) ? raw.font : "Public Sans",
    corners: Object.hasOwn(CORNERS, raw.corners) ? raw.corners : "standard",
    header: HEADERS.includes(raw.header) ? raw.header : "clair",
  };
}

/** Toutes les variables CSS du site, calculées à partir d'un design normalisé. */
export function customThemeVars(theme) {
  const { bg, surface, ink, primary, festive } = theme.colors;
  const dark = luminance(bg) < 0.18;
  const onPrimary = contrast("#ffffff", primary) >= contrast(dark ? bg : "#111111", primary) ? "#ffffff" : dark ? bg : "#111111";
  const primaryWash = mix(surface, primary, 0.1);
  const radius = CORNERS[theme.corners];

  const vars = {
    "--color-bg": bg,
    "--color-surface": surface,
    "--color-surface-2": mix(surface, ink, 0.05),
    "--color-line": mix(surface, ink, 0.14),
    "--color-line-strong": mix(surface, ink, 0.3),
    "--color-ink": ink,
    "--color-ink-2": ensureContrast(mix(ink, surface, 0.25), [surface, bg], 7),
    "--color-ink-3": ensureContrast(mix(ink, surface, 0.4), [surface, bg], 4.6),
    "--color-primary": primary,
    "--color-primary-hover": mix(primary, dark ? "#ffffff" : "#000000", 0.15),
    "--color-primary-wash": primaryWash,
    "--color-on-primary": onPrimary,
    "--color-festive": festive,
    "--color-festive-wash": mix(surface, festive, 0.1),
    // Texte posé sur la couleur festive (bandeau rayé du ticket) : blanc ou fond sombre, selon le meilleur contraste.
    "--color-on-festive": contrast("#ffffff", festive) >= contrast(dark ? bg : "#111111", festive) ? "#ffffff" : dark ? bg : "#111111",
    "--color-strong": ink,
    "--color-strong-hover": mix(ink, dark ? "#ffffff" : "#000000", 0.2),
    "--color-on-strong": surface,
    "--color-notice-line": mix(surface, primary, 0.25),
    "--color-overlay": `${ink}cc`,
    "--font-heading": FONTS[theme.font],
    "--radius-sm": radius.sm,
    "--radius-md": radius.md,
    "--radius-lg": radius.lg,
    "color-scheme": dark ? "dark" : "light",
  };

  if (dark) {
    Object.assign(vars, {
      "--color-success": "#5fd39a",
      "--color-success-wash": "#12301f",
      "--color-warn": "#f2b84b",
      "--color-warn-wash": "#2e2716",
      "--color-warn-line": "#5a4720",
      "--color-danger": "#ff8a7a",
      "--color-danger-wash": "#3a1b1b",
      "--color-overlay": "#05080fd9",
      "--shadow-card": "0 1px 2px #00000040",
      "--shadow-raised": "0 12px 32px #00000080",
    });
  }

  if (theme.header === "couleur") {
    Object.assign(vars, {
      "--color-header-bg": primary,
      "--color-header-ink": onPrimary,
      "--color-header-ink-2": onPrimary,
      "--color-header-link": onPrimary,
      "--color-header-mark": onPrimary,
    });
  } else {
    Object.assign(vars, {
      "--color-header-bg": surface,
      "--color-header-ink": ink,
      "--color-header-ink-2": vars["--color-ink-3"],
      "--color-header-link": primary,
      "--color-header-mark": primary,
    });
  }
  return vars;
}

/** Les 3 couleurs d'aperçu (fond, action, accent), comme pour les designs du catalogue. */
export function customSwatches(theme) {
  return [theme.colors.bg, theme.colors.primary, theme.colors.festive];
}

/** Lit un design enregistré en base (texte JSON) ; null s'il est absent ou illisible. */
export function parseStoredTheme(text) {
  if (!text) return null;
  try {
    return normalizeCustomTheme(typeof text === "string" ? JSON.parse(text) : text);
  } catch {
    return null;
  }
}
