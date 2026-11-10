import { query } from "@/server/db";
import { json, route } from "@/server/auth";
import { parseStoredTheme } from "@/lib/customTheme";

export const dynamic = "force-dynamic";

export const GET = route(null, async () => {
  const rows = await query(
    "SELECT id, name, slug, contract_address AS address, block_number AS blockNumber, theme, custom_theme AS customTheme FROM cities ORDER BY name"
  );
  return json(rows.map((city) => ({ ...city, customTheme: parseStoredTheme(city.customTheme) })));
});
