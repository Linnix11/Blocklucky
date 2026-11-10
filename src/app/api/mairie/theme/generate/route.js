import { query } from "@/server/db";
import { body, json, route } from "@/server/auth";
import { GeminiError, generateCustomTheme } from "@/server/gemini";

const MIN = 10;
const MAX = 600;

/** Propose un design personnalisé à partir de la description de la mairie (rien n'est enregistré). */
export const POST = route("mairie", async (request, { user }) => {
  const description = String((await body(request)).description ?? "").trim();
  if (description.length < MIN) return json({ error: "Décrivez le style souhaité en quelques mots (10 caractères au moins)." }, 400);
  if (description.length > MAX) return json({ error: `Description trop longue : ${MAX} caractères au plus.` }, 400);

  const [city] = await query("SELECT name FROM cities WHERE id = ?", [user.cityId]);
  try {
    return json({ theme: await generateCustomTheme(user.cityId, city.name, description) });
  } catch (error) {
    if (error instanceof GeminiError) return json({ error: error.message }, error.status);
    throw error;
  }
});
