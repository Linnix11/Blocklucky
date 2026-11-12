import crypto from "node:crypto";
import { query, hashPassword, sha256 } from "@/server/db";
import { body, json, openSession, route } from "@/server/auth";
import { assertAllowed, clientIp, hit } from "@/server/rateLimit";
import { mailEnabled, sendPasswordReset } from "@/server/mail";

const HOUR = 60 * 60 * 1000;
const SENT =
  "Si un compte existe avec ce mail, un lien pour choisir un nouveau mot de passe vient de lui être envoyé (valable 1 heure).";

/**
 * Mot de passe oublié, en deux temps :
 * 1. { email } : envoie un lien /connexion?reinit=… au titulaire. La réponse est toujours la même, que le compte
 *    existe ou non, pour ne pas révéler qui a un compte.
 * 2. { token, password } : le titulaire choisit son nouveau mot de passe ; ses autres sessions sont fermées.
 * Comptes concernés : habitants et mairies. L'admin change son mot de passe dans la configuration du serveur.
 */
export const POST = route(null, async (request) => {
  const data = await body(request);

  if (data.token !== undefined) {
    const token = String(data.token);
    const password = String(data.password || "");
    const limits = [{ key: `reset:ip:${clientIp(request)}`, max: 20, windowMs: HOUR / 4 }];
    assertAllowed(limits);
    const [pending] = /^[0-9a-f]{64}$/.test(token)
      ? await query("SELECT email FROM password_resets WHERE token_hash = ? AND created_at > NOW() - INTERVAL 1 HOUR", [sha256(token)])
      : [];
    if (!pending) {
      hit(limits);
      return json({ error: "Lien invalide ou expiré : refaites une demande de mot de passe oublié." }, 400);
    }
    if (password.length < 6) return json({ error: "Choisissez un mot de passe d'au moins 6 caractères" }, 400);
    const { email } = pending;
    const [user] = await query("SELECT role FROM users WHERE email = ?", [email]);
    if (!user) return json({ error: "Ce compte n'existe plus." }, 400);
    await query("UPDATE users SET password_hash = ? WHERE email = ?", [hashPassword(password), email]);
    await query("DELETE FROM password_resets WHERE email = ?", [email]);
    await query("DELETE FROM sessions WHERE email = ?", [email]);
    await openSession(user.role, email);
    return json({ role: user.role, email });
  }

  const email = String(data.email || "").trim().toLowerCase();
  if (!email) return json({ error: "Mail requis" }, 400);
  // 3 demandes par heure et par mail, 10 par heure et par adresse IP : pas d'inondation de boîte mail.
  const limits = [
    { key: `reset:mail:${email}`, max: 3, windowMs: HOUR },
    { key: `reset:req-ip:${clientIp(request)}`, max: 10, windowMs: HOUR },
  ];
  assertAllowed(limits);
  hit(limits);

  const site = process.env.SITE_URL?.trim().replace(/\/$/, "");
  const devMode = process.env.NODE_ENV !== "production";
  if (!devMode && (!mailEnabled() || !site)) {
    return json({ error: "Envoi de mails indisponible : demandez à votre mairie de réinitialiser votre accès." }, 503);
  }

  const [user] = await query("SELECT 1 FROM users WHERE email = ?", [email]);
  if (!user) return json({ pending: true, message: SENT });

  const token = crypto.randomBytes(32).toString("hex");
  await query("DELETE FROM password_resets WHERE created_at <= NOW() - INTERVAL 1 HOUR");
  await query("INSERT INTO password_resets (token_hash, email) VALUES (?, ?)", [sha256(token), email]);
  // Lien construit avec SITE_URL uniquement (l'en-tête Host vient du visiteur) ; localhost en développement.
  const link = `${site || "http://localhost:3000"}/connexion?reinit=${token}`;

  if (!mailEnabled()) {
    // Développement sans SMTP : le lien est écrit dans le journal du serveur, pour pouvoir tester.
    console.log(`[mot de passe oublié] ${email} : ${link}`);
    return json({ pending: true, message: SENT });
  }
  try {
    await sendPasswordReset(email, link);
  } catch (error) {
    console.error("Envoi du mail de mot de passe oublié impossible :", error);
    await query("DELETE FROM password_resets WHERE token_hash = ?", [sha256(token)]);
    return json({ error: "Envoi du mail impossible pour le moment. Réessayez plus tard." }, 503);
  }
  return json({ pending: true, message: SENT });
});
