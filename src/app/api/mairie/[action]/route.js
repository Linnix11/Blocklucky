import { query } from "@/server/db";
import { openRound, reason, send } from "@/server/chain";
import { body, json, route } from "@/server/auth";

const METHODS = { draw: "requestDraw", retry: "retryDraw" };

/** Actions de la mairie sur sa loterie, signées par le serveur : round (ouverture), draw, retry. */
export const POST = route("mairie", async (request, { user, params }) => {
  if (params.action !== "round" && !METHODS[params.action]) return json({ error: "Action inconnue" }, 404);
  const [city] = await query("SELECT contract_address AS address FROM cities WHERE id = ?", [user.cityId]);
  if (!city) return json({ error: "Ville introuvable" }, 404);
  try {
    const hash =
      params.action === "round" ? await openRound(city.address, await body(request)) : await send(city.address, METHODS[params.action]);
    return json({ hash });
  } catch (error) {
    return json({ error: reason(error) }, 400);
  }
});
