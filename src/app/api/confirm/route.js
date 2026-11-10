import { query, hashPassword, sha256 } from "@/server/db";
import { body, json, openSession, route } from "@/server/auth";
import { assertAllowed, clientIp, hit } from "@/server/rateLimit";

/** Lien de confirmation ouvert : l'habitant choisit son mot de passe, son compte est créé et il est connecté. */
export const POST = route(null, async (request) => {
  const data = await body(request);
  const token = String(data.token || "");
  const password = String(data.password || "");
  const limits = [{ key: `confirm:ip:${clientIp(request)}`, max: 20, windowMs: 15 * 60 * 1000 }];
  assertAllowed(limits);

  const [pending] = /^[0-9a-f]{64}$/.test(token)
    ? await query("SELECT email FROM confirmations WHERE token_hash = ? AND created_at > NOW() - INTERVAL 1 DAY", [sha256(token)])
    : [];
  if (!pending) {
    hit(limits);
    return json({ error: "Lien invalide ou expiré : reconnectez-vous pour en recevoir un nouveau." }, 400);
  }
  if (password.length < 6) return json({ error: "Choisissez un mot de passe d'au moins 6 caractères" }, 400);

  const { email } = pending;
  const [listed] = await query("SELECT 1 FROM participants WHERE identifier = ? LIMIT 1", [email]);
  if (!listed) return json({ error: "Ce mail n'est plus inscrit par aucune mairie" }, 400);
  await query("DELETE FROM confirmations WHERE email = ?", [email]);
  const created = await query("INSERT IGNORE INTO users (email, password_hash, role) VALUES (?, ?, 'participant')", [
    email,
    hashPassword(password),
  ]);
  if (created.affectedRows === 0) return json({ error: "Ce compte est déjà activé : connectez-vous." }, 409);
  await openSession("participant", email);
  return json({ role: "participant", email });
});
