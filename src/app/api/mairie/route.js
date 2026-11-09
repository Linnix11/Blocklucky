import { query } from "@/server/db";
import { json, route } from "@/server/auth";

export const GET = route("mairie", async (_request, { user }) => {
  const [city] = await query(
    "SELECT id, name, slug, contract_address AS address, block_number AS blockNumber FROM cities WHERE id = ?",
    [user.cityId]
  );
  const rows = await query("SELECT identifier FROM participants WHERE city_id = ? ORDER BY identifier", [user.cityId]);
  return json({ city, participants: rows.map((r) => r.identifier) });
});
