/**
 * Sessions et rôles. Admin : identifiants ADMIN_EMAIL / ADMIN_PASSWORD (pas en base).
 * Mairie : compte créé par l'admin. Habitant : mail inscrit par sa mairie.
 */
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { query } from "./db";
import { reason } from "./chain";
import { RateLimitError } from "./rateLimit";

export const EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;
export const WALLET = /^0x[0-9a-fA-F]{40}$/;

export const json = (data, status = 200) => Response.json(data, { status });

/** Durée de vie d'une session (RGPD : durée de conservation limitée). */
const SESSION_DAYS = 30;

export async function currentUser() {
  const token = (await cookies()).get("sid")?.value;
  if (!token) return null;
  const [session] = await query(
    "SELECT role, email FROM sessions WHERE token = ? AND created_at > NOW() - INTERVAL ? DAY",
    [token, SESSION_DAYS]
  );
  if (!session) return null;
  if (session.role === "admin") return { role: "admin", email: session.email };
  const [user] = await query("SELECT id, email, role, city_id AS cityId FROM users WHERE email = ?", [session.email]);
  return user || null;
}

export async function openSession(role, email) {
  // Purge des sessions expirées à chaque nouvelle connexion
  await query("DELETE FROM sessions WHERE created_at <= NOW() - INTERVAL ? DAY", [SESSION_DAYS]);
  const token = crypto.randomBytes(32).toString("hex");
  await query("INSERT INTO sessions (token, role, email) VALUES (?, ?, ?)", [token, role, email]);
  (await cookies()).set("sid", token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * SESSION_DAYS });
}

export async function closeSession() {
  const store = await cookies();
  const token = store.get("sid")?.value;
  if (token) await query("DELETE FROM sessions WHERE token = ?", [token]);
  store.delete("sid");
}

/**
 * Enveloppe une route : vérifie le rôle si demandé, et renvoie les erreurs en JSON.
 * handler(request, { user, params })
 */
export function route(role, handler) {
  return async (request, context) => {
    try {
      const user = role ? await currentUser() : null;
      if (role && user?.role !== role) return json({ error: "Accès refusé" }, 403);
      return await handler(request, { user, params: await context?.params });
    } catch (error) {
      if (error instanceof RateLimitError) return json({ error: error.message }, error.status);
      console.error(error);
      return json({ error: reason(error) }, 500);
    }
  };
}

export async function body(request) {
  return request.json().catch(() => ({}));
}
