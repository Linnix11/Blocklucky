import { query } from "@/server/db";
import { body, json, route } from "@/server/auth";
import { THEME_IDS } from "@/themes";

/** La mairie choisit le design de la page publique de sa loterie. */
export const POST = route("mairie", async (request, { user }) => {
  const { theme } = await body(request);
  if (!THEME_IDS.includes(theme)) return json({ error: "Design inconnu" }, 400);
  await query("UPDATE cities SET theme = ? WHERE id = ?", [theme, user.cityId]);
  return json({ theme });
});
