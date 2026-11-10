import { query } from "@/server/db";
import { body, json, route } from "@/server/auth";
import { THEME_IDS } from "@/themes";
import { CUSTOM_THEME, normalizeCustomTheme } from "@/lib/customTheme";

/**
 * La mairie choisit le design de la page publique de sa loterie :
 * un design du catalogue, ou son design personnalisé (`custom`, validé et corrigé ici avant enregistrement).
 */
export const POST = route("mairie", async (request, { user }) => {
  const { theme, custom } = await body(request);

  if (theme === CUSTOM_THEME) {
    if (custom) {
      const safe = normalizeCustomTheme(custom);
      await query("UPDATE cities SET theme = ?, custom_theme = ? WHERE id = ?", [CUSTOM_THEME, JSON.stringify(safe), user.cityId]);
      return json({ theme: CUSTOM_THEME, customTheme: safe });
    }
    const [city] = await query("SELECT custom_theme FROM cities WHERE id = ?", [user.cityId]);
    if (!city?.custom_theme) return json({ error: "Aucun design personnalisé enregistré : générez-en un d'abord." }, 400);
    await query("UPDATE cities SET theme = ? WHERE id = ?", [CUSTOM_THEME, user.cityId]);
    return json({ theme: CUSTOM_THEME });
  }

  if (!THEME_IDS.includes(theme)) return json({ error: "Design inconnu" }, 400);
  await query("UPDATE cities SET theme = ? WHERE id = ?", [theme, user.cityId]);
  return json({ theme });
});
