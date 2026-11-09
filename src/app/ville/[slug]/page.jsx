"use client";

import { useParams } from "next/navigation";
import { useApp } from "@/components/Shell";
import { CityPage } from "@/views/CityPage";
import { usePageTitle } from "@/hooks/usePageTitle";

function CityNotFound() {
  usePageTitle("Ville introuvable");
  return (
    <main className="page">
      <section className="panel stack">
        <h1>Ville introuvable</h1>
        <p>Cette ville n'a pas de loterie sur BlockLucky.</p>
        <a href="/">← Toutes les villes</a>
      </section>
    </main>
  );
}

export default function Page() {
  const { slug } = useParams();
  const { cities, me } = useApp();
  if (!cities) return <main className="page" />;
  const city = cities.find((c) => c.slug === slug);
  if (!city) return <CityNotFound />;
  return <CityPage key={city.slug} city={city} me={me} />;
}
