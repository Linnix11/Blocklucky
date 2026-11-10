import { query } from "@/server/db";
import { json, route } from "@/server/auth";

export const dynamic = "force-dynamic";

export const GET = route(null, async () =>
  json(await query("SELECT id, name, slug, contract_address AS address, block_number AS blockNumber, theme FROM cities ORDER BY name"))
);
