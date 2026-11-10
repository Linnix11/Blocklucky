/**
 * Tests de l'API du site (rôles, connexion, listes d'habitants), contre un vrai serveur Next et une base MySQL vide.
 * Lancement : npm run test:api (prépare la base « blocklucky_test » et démarre le site, voir scripts/test-api.sh).
 * Aucune blockchain n'est nécessaire : les villes sont créées avec une adresse de contrat existante (fictive).
 */
import { test } from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.BASE_URL || "http://localhost:3100";
const ADMIN = { email: process.env.ADMIN_EMAIL || "admin@test.local", password: process.env.ADMIN_PASSWORD || "test-admin-1234" };

/** Petit client qui garde son cookie de session, comme un navigateur. */
function client(extraHeaders = {}) {
  let cookie = "";
  return async (method, path, body) => {
    const response = await fetch(`${BASE}/api${path}`, {
      method,
      headers: { ...extraHeaders, ...(body ? { "content-type": "application/json" } : {}), ...(cookie ? { cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = response.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0];
    return { status: response.status, data: await response.json().catch(() => null) };
  };
}

const CONTRACT_A = `0x${"a1".repeat(20)}`;
const CONTRACT_B = `0x${"b2".repeat(20)}`;
const admin = client();
const mairieA = client();
const mairieB = client();

test("sans session, les routes protégées refusent l'accès", async () => {
  const anon = client();
  for (const [method, path] of [
    ["GET", "/admin/cities"],
    ["POST", "/admin/cities"],
    ["GET", "/mairie"],
    ["POST", "/mairie/participants"],
    ["POST", "/mairie/draw"],
  ]) {
    assert.equal((await anon(method, path, method === "GET" ? undefined : {})).status, 403, `${method} ${path}`);
  }
  assert.equal((await anon("GET", "/me")).data, null);
});

test("connexion admin : mauvais mot de passe refusé, bon accepté", async () => {
  assert.equal((await admin("POST", "/login", { ...ADMIN, password: "faux" })).status, 401);
  const ok = await admin("POST", "/login", ADMIN);
  assert.equal(ok.status, 200);
  assert.equal(ok.data.role, "admin");
});

test("l'admin crée deux villes ; doublons et données invalides refusés", async () => {
  const a = await admin("POST", "/admin/cities", { name: "Ville Alpha", email: "mairie@alpha.test", password: "alpha123", contractAddress: CONTRACT_A });
  assert.equal(a.status, 200, JSON.stringify(a.data));
  assert.equal(a.data.slug, "ville-alpha");
  const b = await admin("POST", "/admin/cities", { name: "Ville Béta", email: "mairie@beta.test", password: "beta1234", contractAddress: CONTRACT_B });
  assert.equal(b.status, 200, JSON.stringify(b.data));
  assert.equal(b.data.slug, "ville-beta");

  assert.equal((await admin("POST", "/admin/cities", { name: "Ville Alpha", email: "autre@alpha.test", password: "alpha123", contractAddress: CONTRACT_A })).status, 409);
  assert.equal((await admin("POST", "/admin/cities", { name: "Gamma", email: "mairie@alpha.test", password: "alpha123", contractAddress: CONTRACT_A })).status, 409);
  assert.equal((await admin("POST", "/admin/cities", { name: "Gamma", email: "pas-un-mail", password: "alpha123", contractAddress: CONTRACT_A })).status, 400);
  assert.equal((await admin("POST", "/admin/cities", { name: "Gamma", email: "g@gamma.test", password: "alpha123", contractAddress: "0x123" })).status, 400);

  const list = await admin("GET", "/admin/cities");
  assert.deepEqual(list.data.map((c) => c.slug), ["ville-alpha", "ville-beta"]);
});

test("chaque mairie ne voit et ne modifie que sa ville", async () => {
  assert.equal((await mairieA("POST", "/login", { email: "mairie@alpha.test", password: "alpha123" })).data.role, "mairie");
  assert.equal((await mairieB("POST", "/login", { email: "mairie@beta.test", password: "beta1234" })).data.role, "mairie");

  const csv = `mail;nom\nHabitant@Alpha.test;Jean\n0x${"c3".repeat(20)}\nn'importe quoi\nhabitant@alpha.test`;
  const added = await mairieA("POST", "/mairie/participants", { csv });
  assert.equal(added.status, 200);
  assert.equal(added.data.added, 2, "mails en minuscules et doublons fusionnés");
  assert.equal((await mairieA("POST", "/mairie/participants", { csv: "rien d'utile" })).status, 400);
  await mairieB("POST", "/mairie/participants", { csv: "seul@beta.test" });

  const a = await mairieA("GET", "/mairie");
  assert.equal(a.data.city.slug, "ville-alpha");
  assert.deepEqual(a.data.participants, [`0x${"c3".repeat(20)}`, "habitant@alpha.test"]);
  assert.deepEqual((await mairieB("GET", "/mairie")).data.participants, ["seul@beta.test"]);

  // Une mairie n'a pas accès à l'admin, ni aux actions inconnues
  assert.equal((await mairieA("GET", "/admin/cities")).status, 403);
  assert.equal((await mairieA("POST", "/mairie/inconnue", {})).status, 404);
});

test("habitant : première connexion, mot de passe gardé, accès limité à sa ville", async () => {
  const habitant = client();
  assert.equal((await habitant("POST", "/login", { email: "inconnu@nulle.part", password: "secret12" })).status, 401);
  assert.equal((await habitant("POST", "/login", { email: "habitant@alpha.test", password: "123" })).status, 400);

  const first = await habitant("POST", "/login", { email: "habitant@alpha.test", password: "secret12" });
  assert.equal(first.status, 200);
  assert.equal(first.data.role, "participant");
  assert.equal((await habitant("GET", "/cities/ville-alpha/access")).data.allowed, true);
  assert.equal((await habitant("GET", "/cities/ville-beta/access")).data.allowed, false);
  assert.equal((await habitant("GET", "/cities/inexistante/access")).status, 404);
  assert.equal((await habitant("GET", "/mairie")).status, 403);

  // Le mot de passe choisi est maintenant le sien
  assert.equal((await client()("POST", "/login", { email: "habitant@alpha.test", password: "autre123" })).status, 401);
  assert.equal((await client()("POST", "/login", { email: "habitant@alpha.test", password: "secret12" })).status, 200);

  // Portefeuille inscrit, sans compte
  const visitor = client();
  assert.equal((await visitor("GET", `/cities/ville-alpha/access?wallet=0x${"C3".repeat(20)}`)).data.allowed, true);
  assert.equal((await visitor("GET", `/cities/ville-beta/access?wallet=0x${"C3".repeat(20)}`)).data.allowed, false);
});

test("après 5 essais ratés depuis un poste, ce poste est bloqué, pas le vrai titulaire ailleurs", async () => {
  // Les requêtes passent « derrière l'hébergeur » : son relais ajoute l'IP du visiteur en fin de x-forwarded-for.
  const habitant = client({ "x-forwarded-for": "198.51.100.7" });
  // Première connexion : le compte est créé avec ce mot de passe
  assert.equal((await habitant("POST", "/login", { email: "seul@beta.test", password: "bon-secret" })).status, 200);
  for (let i = 0; i < 5; i++) {
    assert.equal((await habitant("POST", "/login", { email: "seul@beta.test", password: `mauvais${i}` })).status, 401);
  }
  const blocked = await habitant("POST", "/login", { email: "seul@beta.test", password: "bon-secret" });
  assert.equal(blocked.status, 429);
  assert.match(blocked.data.error, /Trop d'essais/);

  // Une fausse IP écrite en tête par le visiteur ne contourne pas la limite
  const spoofed = client({ "x-forwarded-for": "1.2.3.4, 198.51.100.7" });
  assert.equal((await spoofed("POST", "/login", { email: "seul@beta.test", password: "bon-secret" })).status, 429);

  // Le vrai titulaire, depuis un autre poste, se connecte normalement
  const owner = client({ "x-forwarded-for": "203.0.113.9" });
  assert.equal((await owner("POST", "/login", { email: "seul@beta.test", password: "bon-secret" })).status, 200);
});

test("lien de confirmation invalide refusé", async () => {
  const visitor = client();
  assert.equal((await visitor("POST", "/confirm", { token: "abc", password: "secret12" })).status, 400);
  assert.equal((await visitor("POST", "/confirm", { token: "0".repeat(64), password: "secret12" })).status, 400);
});

test("suppression d'une ville : sa mairie et ses habitants perdent leur accès", async () => {
  const { data } = await admin("GET", "/admin/cities");
  const beta = data.find((c) => c.slug === "ville-beta");
  assert.equal((await admin("DELETE", `/admin/cities/${beta.id}`)).status, 200);

  assert.equal((await mairieB("GET", "/mairie")).status, 403, "session de la mairie supprimée");
  assert.equal((await client()("POST", "/login", { email: "mairie@beta.test", password: "beta1234" })).status, 401);
  const cities = await client()("GET", "/cities");
  assert.deepEqual(cities.data.map((c) => c.slug), ["ville-alpha"]);
  // La ville Alpha n'est pas touchée
  assert.equal((await mairieA("GET", "/mairie")).data.participants.length, 2);
});

test("déconnexion", async () => {
  assert.equal((await mairieA("POST", "/logout")).status, 200);
  assert.equal((await mairieA("GET", "/mairie")).status, 403);
});
