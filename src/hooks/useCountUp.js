import { useEffect, useRef, useState } from "react";

const DURATION_MS = 900;
const STEPS = 1000n;

function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Fait défiler un montant en wei (bigint) de l'ancienne valeur vers la nouvelle, comme un compteur.
 * Renvoie la valeur à afficher et `bumped` (vrai pendant l'animation, pour un léger surlignage).
 * Au premier affichage et si l'utilisateur demande moins d'animations, la valeur s'affiche directement.
 */
export function useCountUp(target) {
  const [shown, setShown] = useState(target);
  const [bumped, setBumped] = useState(false);
  // Valeur réellement affichée : si un nouveau montant arrive pendant le défilement, on repart d'ici (pas de saut).
  const shownRef = useRef(target);

  useEffect(() => {
    const from = shownRef.current;
    const show = (value) => {
      shownRef.current = value;
      setShown(value);
    };
    if (target === null || target === undefined || from === null || from === undefined || target === from || reducedMotion()) {
      show(target);
      setBumped(false);
      return undefined;
    }

    let frame;
    const start = performance.now();
    setBumped(target > from);
    const tick = (time) => {
      const t = Math.min(1, (time - start) / DURATION_MS);
      const eased = 1 - (1 - t) ** 3;
      show(from + ((target - from) * BigInt(Math.round(eased * Number(STEPS)))) / STEPS);
      if (t < 1) frame = requestAnimationFrame(tick);
      else setBumped(false);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return { shown, bumped };
}
