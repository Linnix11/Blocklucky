import { json } from "@/server/auth";

/**
 * Cours de l'ETH en euros (CoinGecko), mis en cache 5 min côté serveur.
 * La clé reste sur le serveur : elle n'est jamais envoyée au navigateur.
 */
export async function GET() {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=eur", {
      headers: { "x-cg-demo-api-key": process.env.COINGECKO_API_KEY ?? "" },
      next: { revalidate: 300 },
    });
    const eur = (await res.json())?.ethereum?.eur;
    return typeof eur === "number" ? json({ eur }) : json({ eur: null }, 502);
  } catch {
    return json({ eur: null }, 502);
  }
}
