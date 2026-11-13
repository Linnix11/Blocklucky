import { formatEther } from "ethers";

/** Cours de l'ETH en euros, chargé une fois par Shell (null tant qu'il est inconnu). */
let eurRate = null;
export const setEurRate = (rate) => (eurRate = rate);

/** 12000000000000000n → « ≈ 36,12 € » (chaîne vide si le cours est inconnu) */
export function formatEur(wei) {
  if (!eurRate || wei === null || wei === undefined) return "";
  const eur = Number(formatEther(wei)) * eurRate;
  return `≈ ${eur.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: eur < 10 ? 2 : 0 })}`;
}

/** 12000000000000000n → « 0,012 ETH (≈ 36,12 €) » */
export function formatEth(wei, { withUnit = true, maxDigits = 4, eur = true } = {}) {
  if (wei === null || wei === undefined) return "…";
  const value = Number(formatEther(wei)).toLocaleString("fr-FR", { maximumFractionDigits: maxDigits });
  if (!withUnit) return value;
  const euros = eur && formatEur(wei);
  return euros ? `${value} ETH (${euros})` : `${value} ETH`;
}

/** 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 → « 0x7099…79C8 » */
export function shortAddress(address) {
  if (!address) return "";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Secondes → « 08:41 » ou « 2 j 03:12:09 » */
export function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, "0");
  const clock = h > 0 || days > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
  return days > 0 ? `${days} j ${clock}` : clock;
}

/** Horodatage Unix → « 2 nov., 14:05 » */
export function formatDate(unixSeconds) {
  return new Date(unixSeconds * 1000).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** « de Lyon », « d'EtherBay » : élision devant une voyelle ou un h. */
export function deVille(name) {
  return /^[aeiouyhàâäéèêëîïôöùûü]/i.test(name) ? `d'${name}` : `de ${name}`;
}

export function sameAddress(a, b) {
  return Boolean(a && b && a.toLowerCase() === b.toLowerCase());
}

export function explorerLink(explorer, kind, value) {
  return explorer ? `${explorer}/${kind}/${value}` : null;
}
