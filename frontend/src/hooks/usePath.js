import { useEffect, useState } from "react";

/** Change de page sans recharger (historique du navigateur). */
export function navigate(path) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

/**
 * Chemin courant (/admin, /ville/x…), mis à jour par navigate() et les boutons précédent/suivant.
 * Les clics sur les liens internes (<a href="/…">) sont interceptés pour éviter un rechargement.
 */
export function usePath() {
  const [path, setPath] = useState(() => window.location.pathname);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    const onClick = (event) => {
      const link = event.target.closest?.("a[href^='/']");
      if (!link || link.target || event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      navigate(link.getAttribute("href"));
      window.scrollTo(0, 0);
    };
    window.addEventListener("popstate", onPop);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("popstate", onPop);
      document.removeEventListener("click", onClick);
    };
  }, []);
  return path;
}
