import { useCallback, useEffect, useState } from "react";
import { useHash } from "./hooks/useHash";
import { api } from "./lib/api";
import { HomePage } from "./pages/HomePage";
import { CityPage } from "./pages/CityPage";
import { LoginPage } from "./pages/LoginPage";
import { AdminPage } from "./pages/AdminPage";
import { MairiePage } from "./pages/MairiePage";

/** Routage par « #/… » : accueil, #/ville/<slug>, #/connexion, #/admin, #/mairie. */
export default function App() {
  const hash = useHash();
  const [me, setMe] = useState(undefined); // undefined : chargement, null : non connecté
  const [cities, setCities] = useState(null);

  const loadMe = useCallback(() => api("/me").then(setMe).catch(() => setMe(null)), []);
  const loadCities = useCallback(() => api("/cities").then(setCities).catch(() => setCities([])), []);
  useEffect(() => {
    loadMe();
    loadCities();
  }, [loadMe, loadCities]);

  const logout = async () => {
    await api("/logout", { method: "POST" }).catch(() => {});
    setMe(null);
    window.location.hash = "#/";
  };

  const [, route, param] = hash.split("/");
  let page;
  if (route === "ville") {
    const city = cities?.find((c) => c.slug === param);
    page = cities && !city ? <NotFound /> : city ? <CityPage key={city.slug} city={city} me={me} /> : null;
  } else if (route === "connexion") {
    page = <LoginPage onLogin={loadMe} />;
  } else if (route === "admin") {
    page = <Guard me={me} role="admin">{<AdminPage onChange={loadCities} />}</Guard>;
  } else if (route === "mairie") {
    page = <Guard me={me} role="mairie">{<MairiePage />}</Guard>;
  } else {
    page = <HomePage cities={cities} />;
  }

  return (
    <>
      <div className="lights" aria-hidden="true" />
      <header className="site-header">
        <a className="brand" href="#/">
          <span className="brand-name">BlockLucky</span>
          <span className="brand-city">La loterie des villes</span>
        </a>
        <nav className="account-nav" aria-label="Compte">
          {me ? (
            <>
              {me.role === "admin" && <a href="#/admin">Admin</a>}
              {me.role === "mairie" && <a href="#/mairie">Ma mairie</a>}
              <span className="muted account-email">{me.email}</span>
              <button type="button" className="link-button" onClick={logout}>
                Déconnexion
              </button>
            </>
          ) : (
            me === null && <a href="#/connexion">Connexion</a>
          )}
        </nav>
      </header>

      {page}

      <footer className="site-footer">
        <p>
          BlockLucky, un projet Epitech Digital School. Loteries de démonstration sur réseau de test : les ethers
          utilisés n'ont aucune valeur.
        </p>
      </footer>
    </>
  );
}

function Guard({ me, role, children }) {
  if (me === undefined) return <main className="page"><p className="muted">Chargement…</p></main>;
  if (me?.role !== role) {
    return (
      <main className="page">
        <section className="panel stack" role="alert">
          <h2>Accès réservé</h2>
          <p>Connectez-vous avec un compte {role === "admin" ? "administrateur" : "mairie"}.</p>
          <a className="btn btn-gold" href="#/connexion">
            Se connecter
          </a>
        </section>
      </main>
    );
  }
  return children;
}

function NotFound() {
  return (
    <main className="page">
      <section className="panel stack">
        <h2>Ville introuvable</h2>
        <a href="#/">← Toutes les villes</a>
      </section>
    </main>
  );
}
