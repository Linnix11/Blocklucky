import { query, hashPassword, checkPassword } from "@/server/db";
import { body, json, openSession, route } from "@/server/auth";

export const POST = route(null, async (request) => {
  const data = await body(request);
  const email = String(data.email || "").trim().toLowerCase();
  const password = String(data.password || "");
  if (!email || !password) return json({ error: "Mail et mot de passe requis" }, 400);

  if (process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL.toLowerCase()) {
    if (password !== process.env.ADMIN_PASSWORD) return json({ error: "Mot de passe incorrect" }, 401);
    await openSession("admin", email);
    return json({ role: "admin", email });
  }

  let [user] = await query("SELECT email, role, password_hash FROM users WHERE email = ?", [email]);
  if (!user) {
    // Première connexion d'un habitant inscrit par sa mairie : il choisit son mot de passe.
    const [listed] = await query("SELECT city_id FROM participants WHERE identifier = ? LIMIT 1", [email]);
    if (!listed) return json({ error: "Ce mail n'est inscrit par aucune mairie" }, 401);
    if (password.length < 6) return json({ error: "Choisissez un mot de passe d'au moins 6 caractères" }, 400);
    await query("INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'participant')", [email, hashPassword(password)]);
    user = { email, role: "participant" };
  } else if (!checkPassword(password, user.password_hash)) {
    return json({ error: "Mot de passe incorrect" }, 401);
  }
  await openSession(user.role, email);
  return json({ role: user.role, email });
});
