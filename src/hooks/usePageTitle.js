import { useEffect } from "react";

const SITE = "BlockLucky";

/**
 * Titre d'onglet calculé côté client (nom de la ville, accès réservé…), WCAG 2.4.2.
 * Les titres fixes passent par les métadonnées des layouts (src/app/<page>/layout.jsx).
 * Next.js réécrit <title> avec ses métadonnées juste après le montage : on surveille la balise
 * et on remet notre titre tant que la page est affichée.
 */
export function usePageTitle(title) {
  useEffect(() => {
    const wanted = title ? `${title} · ${SITE}` : `${SITE}, la loterie des villes`;
    document.title = wanted;
    const observer = new MutationObserver(() => {
      if (document.title !== wanted) document.title = wanted;
    });
    observer.observe(document.head, { subtree: true, childList: true, characterData: true });
    return () => observer.disconnect();
  }, [title]);
}
