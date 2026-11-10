/**
 * Limite d'essais en mémoire du serveur (suffisant pour une seule instance Node, comme sur Hostinger).
 * Chaque clé (un mail, un mail + une adresse IP…) a droit à `max` essais par fenêtre de `windowMs`.
 * La mémoire est partagée entre les rechargements de module de Next en développement.
 */
const buckets = (globalThis.blockluckyRateLimit ??= new Map());

/** Plus longue fenêtre utilisée (1 h) : au-delà, une entrée ne compte plus et peut être oubliée. */
const MAX_WINDOW_MS = 60 * 60 * 1000;
const SWEEP_ABOVE = 10000;
const SWEEP_EVERY_MS = 60 * 1000; // au plus un ménage par minute, même si la mémoire reste pleine
let lastSweep = 0;

export class RateLimitError extends Error {
  constructor(retryAfterMs) {
    const minutes = Math.max(1, Math.ceil(retryAfterMs / 60000));
    super(`Trop d'essais. Réessayez dans ${minutes} minute${minutes > 1 ? "s" : ""}.`);
    this.status = 429;
  }
}

function recent(key, windowMs, now) {
  const times = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (times.length) buckets.set(key, times);
  else buckets.delete(key);
  return times;
}

/** Lève RateLimitError si l'une des clés a déjà atteint sa limite (sans compter d'essai). */
export function assertAllowed(rules) {
  const now = Date.now();
  for (const { key, max, windowMs } of rules) {
    const times = recent(key, windowMs, now);
    if (times.length >= max) throw new RateLimitError(windowMs - (now - times[0]));
  }
}

/** Compte un essai pour chaque clé. Oublie les entrées périmées quand la mémoire se remplit. */
export function hit(rules) {
  const now = Date.now();
  if (buckets.size > SWEEP_ABOVE && now - lastSweep >= SWEEP_EVERY_MS) {
    lastSweep = now;
    for (const [key, times] of buckets) if (now - times[times.length - 1] >= MAX_WINDOW_MS) buckets.delete(key);
  }
  for (const { key, windowMs } of rules) buckets.set(key, [...recent(key, windowMs, now), now]);
}

/** Efface le compteur d'une clé (par exemple après une connexion réussie). */
export function reset(key) {
  buckets.delete(key);
}

/**
 * Adresse IP du client. Derrière l'hébergeur, c'est la DERNIÈRE valeur de x-forwarded-for : elle est ajoutée par
 * son relais, alors que les premières peuvent être écrites par le visiteur lui-même (donc falsifiées).
 */
export function clientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",").at(-1).trim();
  return forwarded || request.headers.get("x-real-ip") || "direct";
}
