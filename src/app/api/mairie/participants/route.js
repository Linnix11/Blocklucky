import { query } from "@/server/db";
import { EMAIL, WALLET, body, json, route } from "@/server/auth";

/** Extrait les mails et adresses 0x d'un CSV, quel que soit le séparateur ou l'en-tête. */
function parseIdentifiers(csv) {
  const tokens = String(csv).split(/[\s,;"']+/).map((t) => t.trim().toLowerCase());
  return [...new Set(tokens.filter((t) => EMAIL.test(t) || WALLET.test(t)))];
}

export const POST = route("mairie", async (request, { user }) => {
  const data = await body(request);
  const ids = parseIdentifiers(data.csv);
  if (ids.length === 0) return json({ error: "Aucun mail ni adresse 0x trouvé dans le fichier" }, 400);
  if (data.replace) await query("DELETE FROM participants WHERE city_id = ?", [user.cityId]);
  await query("INSERT IGNORE INTO participants (city_id, identifier) VALUES ?", [ids.map((id) => [user.cityId, id])]);
  return json({ added: ids.length });
});
