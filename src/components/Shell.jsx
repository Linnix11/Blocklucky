"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { usePageTitle } from "@/hooks/usePageTitle";
import { setEurRate } from "@/lib/format";

const AppContext = createContext(null);

/** Logo : l'icône BlockLucky (ticket de tombola avec un bloc), la même que celle de l'app iPhone. */
function BrandMark() {
  return <img className="brand-mark" src="/logo.png" alt="" width="32" height="32" />;
}

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
    // Le cours ETH → € est lu avant le premier affichage (1,5 s max) pour que tous les montants l'aient d'emblée.
    // ponytail: cours figé jusqu'au rechargement de la page, suffisant pour une loterie de quelques minutes.
    const rate = api("/eth-eur").then(({ eur }) => setEurRate(eur)).catch(() => {});
    Promise.race([rate, new Promise((resolve) => setTimeout(resolve, 1500))]).then(() => setMounted(true));
    // Arrivée depuis l'app iPhone avec un code (`?code=`) : on l'échange contre une session, puis on le retire
    // de l'adresse (il ne sert qu'une fois). Les autres paramètres (`?acheter=1`) sont gardés.
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      params.delete("code");
      window.history.replaceState(null, "", window.location.pathname + (params.size ? `?${params}` : ""));
    }
    (code ? api("/handoff/redeem", { method: "POST", body: { code } }).catch(() => {}) : Promise.resolve()).then(loadMe);
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
      <header className="site-header">
        <div className="masthead-main">
          <a className="brand" href="/">
            <BrandMark />
            <span className="brand-text">
              <span className="brand-name">BlockLucky</span>
              <span className="brand-tagline">La loterie des villes</span>
            </span>
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
        <div className="footer-inner">
          <div className="footer-brand">
            <a className="brand" href="/">
              <BrandMark />
              <span className="brand-text">
                <span className="brand-name">BlockLucky</span>
                <span className="brand-tagline">La loterie des villes</span>
              </span>
            </a>
            <p className="footer-note">
              Un projet Epitech Digital School avec les mairies partenaires. Tirage au sort vérifiable par Chainlink.
            </p>
          </div>
          <nav className="footer-col" aria-labelledby="footer-discover">
            <h2 id="footer-discover">Découvrir</h2>
            <ul>
              <li><a href="/blockchain">La blockchain, simplement</a></li>
              <li><a href="/regles">Règles du tirage</a></li>
            </ul>
          </nav>
          <nav className="footer-col" aria-labelledby="footer-legal">
            <h2 id="footer-legal">Informations légales</h2>
            <ul>
              <li><a href="/mentions-legales">Mentions légales</a></li>
              <li><a href="/cadre-legal">Cadre légal</a></li>
              <li><a href="/confidentialite">Confidentialité</a></li>
              <li><a href="/accessibilite">Accessibilité : non conforme</a></li>
            </ul>
          </nav>
        </div>
        <p className="footer-bottom">
          <span className="footer-badge">Réseau de test</span>
          Loteries de démonstration : les ethers utilisés n'ont aucune valeur.
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
        <a className="btn btn-primary" href="/connexion">
          Se connecter
        </a>
      </section>
    </main>
  );
}
