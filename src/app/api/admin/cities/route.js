import { query, hashPassword } from "@/server/db";
import { deploy } from "@/server/chain";
import { EMAIL, WALLET, body, json, route } from "@/server/auth";
import { THEME_IDS, themeOrDefault } from "@/themes";

function slugify(name) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const GET = route("admin", async () =>
  json(
    await query(
      `SELECT c.id, c.name, c.slug, c.contract_address AS address, c.theme, u.email AS mairieEmail,
              (SELECT COUNT(*) FROM participants p WHERE p.city_id = c.id) AS participants
       FROM cities c LEFT JOIN users u ON u.city_id = c.id AND u.role = 'mairie' ORDER BY c.name`
    )
  )
);

/** Crée une mairie : son compte et sa loterie (déployée par le serveur si aucun contrat n'est donné). */
export const POST = route("admin", async (request) => {
  const data = await body(request);
  const name = String(data.name || "").trim();
  const email = String(data.email || "").trim().toLowerCase();
  const password = String(data.password || "");
  const existing = String(data.contractAddress || "").trim();
  if (data.theme && !THEME_IDS.includes(data.theme)) return json({ error: "Design inconnu" }, 400);
  const theme = themeOrDefault(data.theme);
  if (!name || !EMAIL.test(email) || password.length < 6) {
    return json({ error: "Nom, mail valide et mot de passe (6 caractères min.) requis" }, 400);
  }
  if (existing && !WALLET.test(existing)) return json({ error: "Adresse de contrat invalide" }, 400);
  const slug = slugify(name);
  if ((await query("SELECT 1 FROM cities WHERE slug = ?", [slug])).length) return json({ error: "Cette ville existe déjà" }, 409);
  if ((await query("SELECT 1 FROM users WHERE email = ?", [email])).length) return json({ error: "Ce mail a déjà un compte" }, 409);

  const deployed = existing ? { address: existing, blockNumber: 0 } : await deploy();
  let cityId;
  try {
    const result = await query("INSERT INTO cities (name, slug, contract_address, block_number, theme) VALUES (?, ?, ?, ?, ?)", [
      name,
      slug,
      deployed.address,
      deployed.blockNumber,
      theme,
    ]);
    cityId = result.insertId;
    await query("INSERT INTO users (email, password_hash, role, city_id) VALUES (?, ?, 'mairie', ?)", [
      email,
      hashPassword(password),
      cityId,
    ]);
  } catch (error) {
    // Le contrat est déjà sur la blockchain (et payé) : on annule l'enregistrement mais on donne son adresse,
    // pour recréer la ville avec ce contrat sans en déployer un second.
    console.error(error);
    if (cityId) await query("DELETE FROM cities WHERE id = ?", [cityId]).catch(() => {});
    const dup = error?.code === "ER_DUP_ENTRY";
    const cause = dup ? "cette ville ou ce mail vient d'être créé par ailleurs" : "erreur de la base";
    const hint = existing ? "" : ` La loterie a quand même été déployée : recréez la ville en indiquant le contrat ${deployed.address}.`;
    return json({ error: `Enregistrement impossible (${cause}).${hint}`, address: deployed.address }, dup ? 409 : 500);
  }
  return json({ id: cityId, slug, address: deployed.address });
});
