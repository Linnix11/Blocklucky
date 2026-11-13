import { query, sha256 } from "@/server/db";
import { body, json, openSession, route } from "@/server/auth";
import { assertAllowed, clientIp, hit } from "@/server/rateLimit";

/** Échange un code de l'app iPhone (usage unique, 2 minutes) contre une session sur ce navigateur. */
export const POST = route(null, async (request) => {
  const code = String((await body(request)).code || "");
  const limits = [{ key: `handoff:ip:${clientIp(request)}`, max: 20, windowMs: 15 * 60 * 1000 }];
  assertAllowed(limits);

  const hash = /^[0-9a-f]{64}$/.test(code) ? sha256(code) : null;
  const [pending] = hash
    ? await query("SELECT role, email FROM handoffs WHERE token_hash = ? AND created_at > NOW() - INTERVAL 2 MINUTE", [hash])
    : [];
  if (!pending) {
    hit(limits);
    return json({ error: "Code expiré : relancez l'achat depuis l'app." }, 400);
  }
  // Usage unique : si deux demandes arrivent en même temps, une seule supprime la ligne et ouvre la session.
  const deleted = await query("DELETE FROM handoffs WHERE token_hash = ?", [hash]);
  if (deleted.affectedRows === 0) return json({ error: "Code déjà utilisé." }, 400);
  await openSession(pending.role, pending.email);
  return json({ role: pending.role, email: pending.email });
});
