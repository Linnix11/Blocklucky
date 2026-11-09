"use client";

import { useParams } from "next/navigation";
import { useApp } from "@/components/Shell";
import { CityPage } from "@/views/CityPage";

export default function Page() {
  const { slug } = useParams();
  const { cities, me } = useApp();
  if (!cities) return <main className="page" />;
  const city = cities.find((c) => c.slug === slug);
  if (!city) {
    return (
      <main className="page">
        <section className="panel stack">
          <h2>Ville introuvable</h2>
          <a href="/">← Toutes les villes</a>
        </section>
      </main>
    );
  }
  return <CityPage key={city.slug} city={city} me={me} />;
}
