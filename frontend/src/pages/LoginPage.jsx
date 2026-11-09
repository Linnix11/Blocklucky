import { useState } from "react";
import { api } from "../lib/api";
import { navigate } from "../hooks/usePath";

const HOME_BY_ROLE = { admin: "/admin", mairie: "/mairie", participant: "/" };

/** Connexion unique (admin, mairie, habitant). Un habitant inscrit choisit son mot de passe à la première connexion. */
export function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const me = await api("/login", { method: "POST", body: { email, password } });
      await onLogin();
      navigate(HOME_BY_ROLE[me.role]);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page page-narrow">
      <section className="panel stack" aria-labelledby="login-title">
        <h1 id="login-title">Connexion</h1>
        <p className="muted">
          Habitants : utilisez le mail donné à votre mairie. À la première connexion, le mot de passe saisi devient le
          vôtre.
        </p>
        <form className="admin-form admin-form-single" onSubmit={submit}>
          <label>
            Mail
            <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label>
            Mot de passe
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-gold btn-block" disabled={busy}>
            {busy ? "Connexion…" : "Se connecter"}
          </button>
        </form>
      </section>
    </main>
  );
}
