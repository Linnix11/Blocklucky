import { closeSession, json, route } from "@/server/auth";

export const POST = route(null, async () => {
  await closeSession();
  return json({ ok: true });
});
