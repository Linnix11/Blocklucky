import crypto from "node:crypto";
import { query, sha256 } from "@/server/db";
import { currentUser, json, route } from "@/server/auth";

/**
 * L'app iPhone ouvre le site dans le navigateur de MetaMask, qui n'a pas la session de l'app.
 * Elle demande ici un code à usage unique (valable 2 minutes) qu'elle ajoute au lien : le site l'échange
 * contre une session (voir ./redeem). Seule l'empreinte du code est gardée en base.
 */
export const POST = route(null, async () => {
  const user = await currentUser();
  if (!user) return json({ error: "Connectez-vous d'abord" }, 401);
  await query("DELETE FROM handoffs WHERE created_at <= NOW() - INTERVAL 2 MINUTE");
  const code = crypto.randomBytes(32).toString("hex");
  await query("INSERT INTO handoffs (token_hash, role, email) VALUES (?, ?, ?)", [sha256(code), user.role, user.email]);
  return json({ code });
});
