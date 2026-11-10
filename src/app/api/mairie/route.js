import { query } from "@/server/db";
import { json, route } from "@/server/auth";
import { parseStoredTheme } from "@/lib/customTheme";

export const GET = route("mairie", async (_request, { user }) => {
  const [city] = await query(
    "SELECT id, name, slug, contract_address AS address, block_number AS blockNumber, theme, custom_theme AS customTheme FROM cities WHERE id = ?",
    [user.cityId]
  );
  const rows = await query("SELECT identifier FROM participants WHERE city_id = ? ORDER BY identifier", [user.cityId]);
  return json({ city: { ...city, customTheme: parseStoredTheme(city.customTheme) }, participants: rows.map((r) => r.identifier) });
});
