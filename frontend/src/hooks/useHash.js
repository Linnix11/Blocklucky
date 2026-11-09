import { useEffect, useState } from "react";

/** Partie « #… » de l'URL, mise à jour quand elle change (routage minimal sans dépendance). */
export function useHash() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return hash;
}
