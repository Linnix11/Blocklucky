import { query } from "@/server/db";
import { currentUser, json, route } from "@/server/auth";

/** Le visiteur peut-il jouer dans cette ville ? (mail connecté ou adresse MetaMask dans la liste) */
export const GET = route(null, async (request, { params }) => {
  const [city] = await query("SELECT id FROM cities WHERE slug = ?", [params.slug]);
  if (!city) return json({ error: "Ville inconnue" }, 404);
  const user = await currentUser();
  const wallet = new URL(request.url).searchParams.get("wallet") || "";
  const ids = [user?.email, wallet.toLowerCase()].filter(Boolean);
  if (ids.length === 0) return json({ allowed: false });
  const rows = await query("SELECT 1 FROM participants WHERE city_id = ? AND identifier IN (?) LIMIT 1", [city.id, ids]);
  return json({ allowed: rows.length > 0 });
});
