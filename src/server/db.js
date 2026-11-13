/**
 * Base MySQL : comptes, sessions, villes et listes de participants.
 * Les tables sont créées au démarrage si elles n'existent pas.
 */
import mysql from "mysql2/promise";
import crypto from "node:crypto";

// Une seule connexion partagée, même quand Next recharge le module en développement.
const pool = (globalThis.blockluckyPool ??= mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "blocklucky",
  connectionLimit: 5,
}));

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS cities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    slug VARCHAR(120) NOT NULL UNIQUE,
    contract_address CHAR(42) NOT NULL,
    block_number INT NOT NULL DEFAULT 0,
    theme VARCHAR(30) NOT NULL DEFAULT 'sobre',
    custom_theme TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(190) NOT NULL UNIQUE,
    password_hash VARCHAR(200) NOT NULL,
    role ENUM('mairie', 'participant') NOT NULL,
    city_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS participants (
    city_id INT NOT NULL,
    identifier VARCHAR(190) NOT NULL,
    PRIMARY KEY (city_id, identifier)
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token CHAR(64) PRIMARY KEY,
    role VARCHAR(20) NOT NULL,
    email VARCHAR(190) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  // Liens de confirmation envoyés à la première connexion d'un habitant (seule l'empreinte du jeton est gardée)
  `CREATE TABLE IF NOT EXISTS confirmations (
    token_hash CHAR(64) PRIMARY KEY,
    email VARCHAR(190) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  // Codes de passage app iPhone → navigateur de MetaMask (usage unique, 2 minutes, seule l'empreinte est gardée)
  `CREATE TABLE IF NOT EXISTS handoffs (
    token_hash CHAR(64) PRIMARY KEY,
    role VARCHAR(20) NOT NULL,
    email VARCHAR(190) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  // Liens « mot de passe oublié » (seule l'empreinte du jeton est gardée, valable 1 heure)
  `CREATE TABLE IF NOT EXISTS password_resets (
    token_hash CHAR(64) PRIMARY KEY,
    email VARCHAR(190) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
];

/**
 * Colonnes ajoutées après la première mise en ligne : ajoutées aux bases existantes si elles manquent.
 * (Vérification par information_schema : « ADD COLUMN IF NOT EXISTS » n'existe pas dans MySQL.)
 */
const MIGRATIONS = [
  { table: "cities", column: "theme", sql: "ALTER TABLE cities ADD COLUMN theme VARCHAR(30) NOT NULL DEFAULT 'sobre'" },
  { table: "cities", column: "custom_theme", sql: "ALTER TABLE cities ADD COLUMN custom_theme TEXT NULL" },
];

async function migrate() {
  for (const { table, column, sql } of MIGRATIONS) {
    const [rows] = await pool.query(
      "SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?",
      [table, column]
    );
    if (rows.length === 0) await pool.query(sql);
  }
}

let ready;
/** Crée les tables et applique les migrations au premier appel. */
function init() {
  ready ??= (async () => {
    for (const sql of SCHEMA) await pool.query(sql);
    await migrate();
  })().catch((error) => {
    ready = null; // nouvel essai au prochain appel
    throw error;
  });
  return ready;
}

export async function query(sql, params) {
  await init();
  const [rows] = await pool.query(sql, params);
  return rows;
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  return `${salt}:${crypto.scryptSync(password, salt, 32).toString("hex")}`;
}

/** Empreinte SHA-256 (jetons de confirmation, comparaison du mot de passe admin). */
export function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

/** Comparaison en temps constant de deux chaînes (les empreintes ont toujours la même longueur). */
export function sameSecret(a, b) {
  return crypto.timingSafeEqual(Buffer.from(sha256(a), "hex"), Buffer.from(sha256(b), "hex"));
}

export function checkPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  const candidate = crypto.scryptSync(password, salt, 32);
  return crypto.timingSafeEqual(candidate, Buffer.from(hash, "hex"));
}
