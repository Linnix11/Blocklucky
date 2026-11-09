/**
 * Serveur BlockLucky : sert l'interface (dist/) et l'API des comptes.
 *   Admin    : identifiants dans ADMIN_EMAIL / ADMIN_PASSWORD, crée les mairies.
 *   Mairie   : compte créé par l'admin, gère sa liste de participants (CSV) et sa loterie.
 *   Habitant : mail présent dans la liste d'une mairie ; il choisit son mot de passe à la première connexion.
 * Lancement : npm start (port PORT, 3000 par défaut).
 */
require("dotenv").config({ quiet: true });
const path = require("node:path");
const crypto = require("node:crypto");
const express = require("express");
const db = require("./db");
const chain = require("./chain");

const app = express();
app.use(express.json({ limit: "5mb" }));

const EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;
const WALLET = /^0x[0-9a-fA-F]{40}$/;

// ---------- Sessions ----------
function readCookie(req, name) {
  const match = (req.headers.cookie || "").match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return match ? match[1] : null;
}

async function currentUser(req) {
  const token = readCookie(req, "sid");
  if (!token) return null;
  const [session] = await db.query("SELECT role, email FROM sessions WHERE token = ?", [token]);
  if (!session) return null;
  if (session.role === "admin") return session;
  const [user] = await db.query("SELECT id, email, role, city_id AS cityId FROM users WHERE email = ?", [session.email]);
  return user || null;
}

const requireRole = (role) => async (req, res, next) => {
  req.user = await currentUser(req);
  if (req.user?.role !== role) return res.status(403).json({ error: "Accès refusé" });
  next();
};

async function openSession(res, role, email) {
  const token = crypto.randomBytes(32).toString("hex");
  await db.query("INSERT INTO sessions (token, role, email) VALUES (?, ?, ?)", [token, role, email]);
  res.setHeader("Set-Cookie", `sid=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000`);
}

// Les erreurs des routes async remontent ici (Express 5)
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

function slugify(name) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Extrait les mails et adresses 0x d'un CSV, quel que soit le séparateur ou l'en-tête. */
function parseIdentifiers(csv) {
  const tokens = String(csv).split(/[\s,;"']+/).map((t) => t.trim().toLowerCase());
  return [...new Set(tokens.filter((t) => EMAIL.test(t) || WALLET.test(t)))];
}

// ---------- Connexion ----------
app.post(
  "/api/login",
  wrap(async (req, res) => {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (!email || !password) return res.status(400).json({ error: "Mail et mot de passe requis" });

    if (process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL.toLowerCase()) {
      if (password !== process.env.ADMIN_PASSWORD) return res.status(401).json({ error: "Mot de passe incorrect" });
      await openSession(res, "admin", email);
      return res.json({ role: "admin", email });
    }

    let [user] = await db.query("SELECT email, role, password_hash FROM users WHERE email = ?", [email]);
    if (!user) {
      // Première connexion d'un habitant inscrit par sa mairie : il choisit son mot de passe.
      const [listed] = await db.query("SELECT city_id FROM participants WHERE identifier = ? LIMIT 1", [email]);
      if (!listed) return res.status(401).json({ error: "Ce mail n'est inscrit par aucune mairie" });
      if (password.length < 6) return res.status(400).json({ error: "Choisissez un mot de passe d'au moins 6 caractères" });
      await db.query("INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'participant')", [
        email,
        db.hashPassword(password),
      ]);
      user = { email, role: "participant" };
    } else if (!db.checkPassword(password, user.password_hash)) {
      return res.status(401).json({ error: "Mot de passe incorrect" });
    }
    await openSession(res, user.role, email);
    res.json({ role: user.role, email });
  })
);

app.post(
  "/api/logout",
  wrap(async (req, res) => {
    const token = readCookie(req, "sid");
    if (token) await db.query("DELETE FROM sessions WHERE token = ?", [token]);
    res.setHeader("Set-Cookie", "sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
    res.json({ ok: true });
  })
);

app.get(
  "/api/me",
  wrap(async (req, res) => {
    const user = await currentUser(req);
    res.json(user ? { role: user.role, email: user.email, cityId: user.cityId ?? null } : null);
  })
);

// ---------- Public ----------
app.get(
  "/api/cities",
  wrap(async (_req, res) => {
    res.json(
      await db.query(
        "SELECT id, name, slug, contract_address AS address, block_number AS blockNumber FROM cities ORDER BY name"
      )
    );
  })
);

/** Le visiteur peut-il jouer dans cette ville ? (mail connecté ou adresse MetaMask dans la liste) */
app.get(
  "/api/cities/:slug/access",
  wrap(async (req, res) => {
    const [city] = await db.query("SELECT id FROM cities WHERE slug = ?", [req.params.slug]);
    if (!city) return res.status(404).json({ error: "Ville inconnue" });
    const user = await currentUser(req);
    const ids = [user?.email, String(req.query.wallet || "").toLowerCase()].filter(Boolean);
    if (ids.length === 0) return res.json({ allowed: false });
    const rows = await db.query("SELECT 1 FROM participants WHERE city_id = ? AND identifier IN (?) LIMIT 1", [city.id, ids]);
    res.json({ allowed: rows.length > 0 });
  })
);

// ---------- Admin ----------
app.get(
  "/api/admin/cities",
  requireRole("admin"),
  wrap(async (_req, res) => {
    res.json(
      await db.query(
        `SELECT c.id, c.name, c.slug, c.contract_address AS address, u.email AS mairieEmail,
                (SELECT COUNT(*) FROM participants p WHERE p.city_id = c.id) AS participants
         FROM cities c LEFT JOIN users u ON u.city_id = c.id AND u.role = 'mairie' ORDER BY c.name`
      )
    );
  })
);

app.post(
  "/api/admin/cities",
  requireRole("admin"),
  wrap(async (req, res) => {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const existing = String(req.body.contractAddress || "").trim();
    if (!name || !EMAIL.test(email) || password.length < 6) {
      return res.status(400).json({ error: "Nom, mail valide et mot de passe (6 caractères min.) requis" });
    }
    if (existing && !WALLET.test(existing)) return res.status(400).json({ error: "Adresse de contrat invalide" });
    const slug = slugify(name);
    if ((await db.query("SELECT 1 FROM cities WHERE slug = ?", [slug])).length) {
      return res.status(409).json({ error: "Cette ville existe déjà" });
    }
    if ((await db.query("SELECT 1 FROM users WHERE email = ?", [email])).length) {
      return res.status(409).json({ error: "Ce mail a déjà un compte" });
    }

    const deployed = existing ? { address: existing, blockNumber: 0 } : await chain.deployLottery();
    const result = await db.query("INSERT INTO cities (name, slug, contract_address, block_number) VALUES (?, ?, ?, ?)", [
      name,
      slug,
      deployed.address,
      deployed.blockNumber,
    ]);
    await db.query("INSERT INTO users (email, password_hash, role, city_id) VALUES (?, ?, 'mairie', ?)", [
      email,
      db.hashPassword(password),
      result.insertId,
    ]);
    res.json({ id: result.insertId, slug, address: deployed.address });
  })
);

app.delete(
  "/api/admin/cities/:id",
  requireRole("admin"),
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    await db.query("DELETE FROM participants WHERE city_id = ?", [id]);
    await db.query("DELETE FROM users WHERE city_id = ? AND role = 'mairie'", [id]);
    await db.query("DELETE FROM cities WHERE id = ?", [id]);
    res.json({ ok: true });
  })
);

// ---------- Mairie ----------
async function mairieCity(req) {
  const [city] = await db.query(
    "SELECT id, name, slug, contract_address AS address, block_number AS blockNumber FROM cities WHERE id = ?",
    [req.user.cityId]
  );
  return city;
}

app.get(
  "/api/mairie",
  requireRole("mairie"),
  wrap(async (req, res) => {
    const city = await mairieCity(req);
    const participants = await db.query("SELECT identifier FROM participants WHERE city_id = ? ORDER BY identifier", [
      city.id,
    ]);
    res.json({ city, participants: participants.map((p) => p.identifier) });
  })
);

app.post(
  "/api/mairie/participants",
  requireRole("mairie"),
  wrap(async (req, res) => {
    const ids = parseIdentifiers(req.body.csv);
    if (ids.length === 0) return res.status(400).json({ error: "Aucun mail ni adresse 0x trouvé dans le fichier" });
    if (req.body.replace) await db.query("DELETE FROM participants WHERE city_id = ?", [req.user.cityId]);
    await db.query("INSERT IGNORE INTO participants (city_id, identifier) VALUES ?", [ids.map((id) => [req.user.cityId, id])]);
    res.json({ added: ids.length });
  })
);

app.delete(
  "/api/mairie/participants/:identifier",
  requireRole("mairie"),
  wrap(async (req, res) => {
    await db.query("DELETE FROM participants WHERE city_id = ? AND identifier = ?", [req.user.cityId, req.params.identifier]);
    res.json({ ok: true });
  })
);

const LOTTERY_ACTIONS = { round: null, draw: "requestDraw", retry: "retryDraw" };
app.post(
  "/api/mairie/:action",
  requireRole("mairie"),
  wrap(async (req, res) => {
    if (!(req.params.action in LOTTERY_ACTIONS)) return res.status(404).json({ error: "Action inconnue" });
    const city = await mairieCity(req);
    try {
      const hash =
        req.params.action === "round"
          ? await chain.startRound(city.address, req.body)
          : await chain.call(city.address, LOTTERY_ACTIONS[req.params.action]);
      res.json({ hash });
    } catch (error) {
      res.status(400).json({ error: chain.reason(error) });
    }
  })
);

// ---------- Interface ----------
const dist = path.join(__dirname, "..", "dist");
app.use(express.static(dist));
app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: chain.reason(error) });
});

const port = Number(process.env.PORT || 3000);
db.init()
  .then(() => app.listen(port, () => console.log(`BlockLucky sur http://localhost:${port}`)))
  .catch((error) => {
    console.error("Base de données injoignable :", error.message);
    process.exit(1);
  });
