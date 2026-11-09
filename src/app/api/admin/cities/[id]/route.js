import { query } from "@/server/db";
import { json, route } from "@/server/auth";

/** Supprime la mairie, son compte et sa liste. Le contrat reste sur la blockchain. */
export const DELETE = route("admin", async (_request, { params }) => {
  const id = Number(params.id);
  await query("DELETE FROM participants WHERE city_id = ?", [id]);
  await query("DELETE FROM users WHERE city_id = ? AND role = 'mairie'", [id]);
  await query("DELETE FROM cities WHERE id = ?", [id]);
  return json({ ok: true });
});
