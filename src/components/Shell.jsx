"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { usePageTitle } from "@/hooks/usePageTitle";

const AppContext = createContext(null);

/** Bandeau défilant du pied de page (décoratif : le même texte figure en clair dans les pages). */
const MARQUEE = [
  "Tirage vérifiable par Chainlink",
  "100 % de la cagnotte au gagnant",
  "Ethers fictifs, aucun vrai argent",
  "Une loterie par ville",
];

/** Session (me) et liste des villes, partagées par toutes les pages. */
export const useApp = () => useContext(AppContext);

/**
 * Cadre commun : en-tête, compte connecté, pied de page.
 * Le site dépend du navigateur (MetaMask, heure locale) : il est rendu côté client uniquement.
 */
export function Shell({ children }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState(undefined); // undefined : chargement, null : non connecté
  const [cities, setCities] = useState(null);

  const loadMe = useCallback(() => api("/me").then(setMe).catch(() => setMe(null)), []);
  const loadCities = useCallback(() => api("/cities").then(setCities).catch(() => setCities([])), []);

  useEffect(() => {
    setMounted(true);
    loadMe();
    loadCities();
    // Liens internes (<a href="/…">) : navigation sans rechargement
    const onClick = (event) => {
      const link = event.target.closest?.("a[href^='/']");
      if (!link || link.target || event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      router.push(link.getAttribute("href"));
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [loadMe, loadCities, router]);

  const logout = async () => {
    await api("/logout", { method: "POST" }).catch(() => {});
    setMe(null);
    router.push("/");
  };

  return (
    <AppContext.Provider value={{ me, cities, loadMe, loadCities }}>
      <div className="lights" aria-hidden="true" />
      <header className="site-header">
        <p className="masthead-line">
          <span>La loterie des villes</span>
          <span>Réseau de test Sepolia</span>
        </p>
        <div className="masthead-main">
          <a className="brand" href="/">
            <span className="brand-name">BlockLucky</span>
          </a>
          <nav className="account-nav" aria-label="Compte">
            {me ? (
              <>
                {me.role === "admin" && <a href="/admin">Admin</a>}
                {me.role === "mairie" && <a href="/mairie">Ma mairie</a>}
                <span className="muted account-email">{me.email}</span>
                <button type="button" className="link-button" onClick={logout}>
                  Déconnexion
                </button>
              </>
            ) : (
              me === null && <a href="/connexion">Connexion</a>
            )}
          </nav>
        </div>
      </header>

      {mounted ? children : <main className="page" />}

      <footer className="site-footer">
        <div className="marquee" aria-hidden="true">
          <div className="marquee-track">
            {[0, 1].map((copy) => (
              <span key={copy} className="marquee-text">
                {MARQUEE.map((item) => (
                  <span key={item}>
                    {item} <span className="marquee-dot">◆</span>{" "}
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
        <p className="footer-note">
          BlockLucky, un projet Epitech Digital School. Loteries de démonstration sur réseau de test : les ethers
          utilisés n'ont aucune valeur.
        </p>
      </footer>
    </AppContext.Provider>
  );
}

/** Page réservée à un rôle (admin ou mairie). */
export function Guard({ role, children }) {
  const { me } = useApp();
  if (me === undefined) {
    return (
      <main className="page">
        <p className="muted">Chargement…</p>
      </main>
    );
  }
  if (me?.role !== role) return <AccessDenied role={role} />;
  return children;
}

function AccessDenied({ role }) {
  usePageTitle("Accès réservé");
  return (
    <main className="page">
      <section className="panel stack" role="alert">
        <h1>Accès réservé</h1>
        <p>Connectez-vous avec un compte {role === "admin" ? "administrateur" : "mairie"}.</p>
        <a className="btn btn-gold" href="/connexion">
          Se connecter
        </a>
      </section>
    </main>
  );
}
