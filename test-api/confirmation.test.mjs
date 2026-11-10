/**
 * Première connexion d'un habitant quand le serveur envoie des mails (SMTP_HOST renseigné) :
 * lien de confirmation, mot de passe choisi en l'ouvrant, lien à usage unique.
 * Un faux serveur SMTP minimal reçoit les mails ; le site testé (MAIL_BASE_URL) l'utilise comme serveur d'envoi.
 * Lancement : npm run test:api (voir scripts/test-api.sh).
 */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import net from "node:net";

const BASE = process.env.MAIL_BASE_URL || "http://localhost:3101";
const SMTP_PORT = Number(process.env.MAIL_TEST_SMTP_PORT || 2526);
const ADMIN = { email: process.env.ADMIN_EMAIL || "admin@test.local", password: process.env.ADMIN_PASSWORD || "test-admin-1234" };

/** Mails reçus : texte brut, quoted-printable décodé pour les liens (« =3D » et coupures « =\n »). */
const inbox = [];
let smtp;

before(async () => {
  smtp = net.createServer((socket) => {
    let buffer = "";
    let message = null;
    socket.write("220 test\r\n");
    socket.on("data", (chunk) => {
      buffer += chunk.toString();
      let end;
      while ((end = buffer.indexOf("\r\n")) >= 0) {
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        if (message !== null) {
          if (line === ".") {
            inbox.push(message.replace(/=\n/g, "").replace(/=3D/g, "="));
            message = null;
            socket.write("250 ok\r\n");
          } else message += `${line}\n`;
        } else if (/^DATA/i.test(line)) {
          message = "";
          socket.write("354 go\r\n");
        } else if (/^QUIT/i.test(line)) socket.end("221 bye\r\n");
        else if (line) socket.write("250 ok\r\n");
      }
    });
  });
  await new Promise((resolve) => smtp.listen(SMTP_PORT, "127.0.0.1", resolve));
});
after(() => smtp.close());

function client() {
  let cookie = "";
  return async (method, path, body) => {
    const response = await fetch(`${BASE}/api${path}`, {
      method,
      headers: { ...(body ? { "content-type": "application/json" } : {}), ...(cookie ? { cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = response.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0];
    return { status: response.status, data: await response.json().catch(() => null) };
  };
}

const tokens = () => inbox.map((mail) => mail.match(/jeton=([0-9a-f]{64})/)?.[1]).filter(Boolean);

test("lien de confirmation : l'intrus ne choisit pas le mot de passe, le lien ne sert qu'une fois", async () => {
  const admin = client();
  assert.equal((await admin("POST", "/login", ADMIN)).status, 200);
  const city = await admin("POST", "/admin/cities", { name: "Delta", email: "mairie@delta.test", password: "delta123", contractAddress: `0x${"d4".repeat(20)}` });
  assert.equal(city.status, 200, JSON.stringify(city.data));
  const mairie = client();
  await mairie("POST", "/login", { email: "mairie@delta.test", password: "delta123" });
  await mairie("POST", "/mairie/participants", { csv: "jo@delta.test" });

  // Quelqu'un d'autre tente la première connexion : un lien part chez le vrai habitant, aucun compte n'est créé
  const intrus = client();
  const first = await intrus("POST", "/login", { email: "jo@delta.test", password: "mdp-intrus" });
  assert.equal(first.status, 202);
  assert.equal(first.data.pending, true);
  assert.equal((await intrus("GET", "/me")).data, null, "pas de session sans confirmation");

  // Une nouvelle demande n'annule pas le premier lien
  assert.equal((await intrus("POST", "/login", { email: "jo@delta.test", password: "mdp-intrus" })).status, 202);
  assert.equal(tokens().length, 2);
  // Le lien pointe vers SITE_URL (jamais vers l'adresse envoyée par le visiteur dans l'en-tête Host)
  assert.ok(inbox.every((mail) => mail.includes(`${BASE}/connexion?jeton=`)), "lien construit avec SITE_URL");
  const [link] = tokens();

  const jo = client();
  assert.equal((await jo("POST", "/confirm", { token: link, password: "123" })).status, 400, "mot de passe trop court");
  const confirmed = await jo("POST", "/confirm", { token: link, password: "vrai-secret" });
  assert.equal(confirmed.status, 200, JSON.stringify(confirmed.data));
  assert.equal((await jo("GET", "/me")).data.email, "jo@delta.test");

  // Lien déjà utilisé, et second lien inutile une fois le compte activé
  assert.equal((await client()("POST", "/confirm", { token: link, password: "autre-secret" })).status, 400);
  assert.equal((await client()("POST", "/confirm", { token: tokens()[1], password: "autre-secret" })).status, 400);

  assert.equal((await client()("POST", "/login", { email: "jo@delta.test", password: "mdp-intrus" })).status, 401);
  assert.equal((await client()("POST", "/login", { email: "jo@delta.test", password: "vrai-secret" })).status, 200);
});

test("au plus 3 mails de confirmation par heure pour un même mail", async () => {
  const mairie = client();
  await mairie("POST", "/login", { email: "mairie@delta.test", password: "delta123" });
  await mairie("POST", "/mairie/participants", { csv: "lea@delta.test" });
  const visitor = client();
  for (let i = 0; i < 3; i++) assert.equal((await visitor("POST", "/login", { email: "lea@delta.test", password: "x" })).status, 202);
  assert.equal((await visitor("POST", "/login", { email: "lea@delta.test", password: "x" })).status, 429);
});
