import { useEffect, useState } from "react";

/** Heure actuelle en secondes Unix, mise à jour chaque seconde (pour le compte à rebours). */
export function useNow() {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}
