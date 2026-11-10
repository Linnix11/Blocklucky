import { query } from "@/server/db";
import { json, route } from "@/server/auth";

/**
 * Supprime la mairie, son compte et sa liste. Le contrat reste sur la blockchain.
 * Les comptes d'habitants qui ne sont plus inscrits dans aucune ville sont supprimés aussi, avec leurs sessions.
 */
export const DELETE = route("admin", async (_request, { params }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) return json({ error: "Ville inconnue" }, 404);
  await query("DELETE FROM participants WHERE city_id = ?", [id]);
  await query("DELETE FROM users WHERE city_id = ? AND role = 'mairie'", [id]);
  await query("DELETE FROM cities WHERE id = ?", [id]);
  await query(
    "DELETE FROM users WHERE role = 'participant' AND NOT EXISTS (SELECT 1 FROM participants p WHERE p.identifier = users.email)"
  );
  await query(
    "DELETE FROM sessions WHERE role <> 'admin' AND NOT EXISTS (SELECT 1 FROM users u WHERE u.email = sessions.email)"
  );
  await query("DELETE FROM confirmations WHERE NOT EXISTS (SELECT 1 FROM participants p WHERE p.identifier = confirmations.email)");
  return json({ ok: true });
});
