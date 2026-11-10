import crypto from "node:crypto";
import { query, hashPassword, checkPassword, sameSecret, sha256 } from "@/server/db";
import { body, json, openSession, route } from "@/server/auth";
import { assertAllowed, clientIp, hit, reset } from "@/server/rateLimit";
import { mailEnabled, sendConfirmation } from "@/server/mail";

const QUARTER_HOUR = 15 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

/**
 * Connexion unique (admin, mairie, habitant).
 * Limite, par quart d'heure : 5 essais ratés par mail depuis une même adresse IP (bloquer ne gêne que celui qui
 * se trompe, pas le vrai titulaire ailleurs), et 50 par mail au total (contre les essais venus de nombreuses IP).
 * Première connexion d'un habitant inscrit : si l'envoi de mails est configuré (SMTP_HOST), un lien de confirmation
 * lui est envoyé et c'est en l'ouvrant qu'il choisit son mot de passe ; sinon il le choisit directement.
 */
export const POST = route(null, async (request) => {
  const data = await body(request);
  const email = String(data.email || "").trim().toLowerCase();
  const password = String(data.password || "");
  if (!email || !password) return json({ error: "Mail et mot de passe requis" }, 400);

  const isAdmin = Boolean(process.env.ADMIN_EMAIL) && email === process.env.ADMIN_EMAIL.toLowerCase();
  const limits = [
    { key: `login:mail-ip:${email}:${clientIp(request)}`, max: 5, windowMs: QUARTER_HOUR },
    // Pas de limite globale pour l'admin : son mot de passe (long, dans .env) ne se devine pas, et personne
    // ne doit pouvoir bloquer son compte en ratant exprès depuis plusieurs adresses.
    ...(isAdmin ? [] : [{ key: `login:mail:${email}`, max: 50, windowMs: QUARTER_HOUR }]),
  ];
  assertAllowed(limits);
  const refuse = (error) => {
    hit(limits);
    return json({ error }, 401);
  };
  const accept = async (role) => {
    reset(limits[0].key);
    await openSession(role, email);
    return json({ role, email });
  };

  if (isAdmin) {
    if (!sameSecret(password, process.env.ADMIN_PASSWORD || "")) return refuse("Mot de passe incorrect");
    return accept("admin");
  }

  const [user] = await query("SELECT email, role, password_hash FROM users WHERE email = ?", [email]);
  if (user) return checkPassword(password, user.password_hash) ? accept(user.role) : refuse("Mot de passe incorrect");

  // Première connexion d'un habitant inscrit par sa mairie
  const [listed] = await query("SELECT city_id FROM participants WHERE identifier = ? LIMIT 1", [email]);
  if (!listed) return refuse("Ce mail n'est inscrit par aucune mairie");

  if (mailEnabled()) {
    // Le lien est construit avec SITE_URL uniquement : l'en-tête Host vient du visiteur et pourrait faire
    // pointer le lien vers un autre site, qui récupérerait le jeton.
    const site = process.env.SITE_URL?.trim().replace(/\/$/, "");
    if (!site) {
      console.error("SITE_URL manquant : impossible de construire le lien de confirmation (voir .env.example).");
      return json({ error: "Envoi du mail de confirmation impossible pour le moment. Réessayez plus tard." }, 503);
    }
    // 3 liens par heure et par mail au plus, pour ne pas servir à inonder une boîte
    const mailLimit = [{ key: `confirm:${email}`, max: 3, windowMs: HOUR }];
    assertAllowed(mailLimit);
    const token = crypto.randomBytes(32).toString("hex");
    // Les liens déjà envoyés restent valables : une nouvelle demande ne peut pas annuler celui de l'habitant.
    await query("DELETE FROM confirmations WHERE created_at <= NOW() - INTERVAL 1 DAY");
    await query("INSERT INTO confirmations (token_hash, email) VALUES (?, ?)", [sha256(token), email]);
    try {
      await sendConfirmation(email, `${site}/connexion?jeton=${token}`);
    } catch (error) {
      // Le détail (serveur mail, identifiants) reste dans le journal du serveur, pas chez le visiteur.
      console.error("Envoi du mail de confirmation impossible :", error);
      await query("DELETE FROM confirmations WHERE token_hash = ?", [sha256(token)]);
      return json({ error: "Envoi du mail de confirmation impossible pour le moment. Réessayez plus tard." }, 503);
    }
    hit(mailLimit);
    return json(
      {
        pending: true,
        message: `Première connexion : un lien de confirmation vient d'être envoyé à ${email}. Ouvrez-le pour choisir votre mot de passe.`,
      },
      202
    );
  }

  if (password.length < 6) return json({ error: "Choisissez un mot de passe d'au moins 6 caractères" }, 400);
  await query("INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'participant')", [email, hashPassword(password)]);
  return accept("participant");
});
