"use client";

import { useParams } from "next/navigation";
import { useApp } from "@/components/Shell";
import { ScreenPage } from "@/views/ScreenPage";

/** Écran de projection d'une ville (place des fêtes, salle municipale). */
export default function Page() {
  const { slug } = useParams();
  const { cities } = useApp();
  if (!cities) return <main className="screen" />;
  const city = cities.find((c) => c.slug === slug);
  if (!city) {
    return (
      <main className="page">
        <p>Cette ville n'a pas de loterie sur BlockLucky.</p>
        <a href="/">← Toutes les villes</a>
      </main>
    );
  }
  return <ScreenPage key={city.slug} city={city} />;
}
