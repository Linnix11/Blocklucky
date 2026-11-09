import { query } from "@/server/db";
import { json, route } from "@/server/auth";

export const DELETE = route("mairie", async (_request, { user, params }) => {
  await query("DELETE FROM participants WHERE city_id = ? AND identifier = ?", [user.cityId, decodeURIComponent(params.identifier)]);
  return json({ ok: true });
});
