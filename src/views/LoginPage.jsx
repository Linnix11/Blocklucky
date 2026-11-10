"use client";

import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useRouter } from "next/navigation";

const HOME_BY_ROLE = { admin: "/admin", mairie: "/mairie", participant: "/" };

/**
 * Connexion unique (admin, mairie, habitant).
 * Un habitant inscrit choisit son mot de passe à la première connexion : directement, ou en ouvrant le lien
 * de confirmation reçu par mail (/connexion?jeton=…) quand le serveur envoie des mails.
 */
export function LoginPage({ onLogin }) {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("jeton"));
  }, []);

  const run = async (call) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const me = await call();
      if (me?.pending) {
        setNotice(me.message);
        setPassword("");
        return;
      }
      await onLogin();
      router.push(HOME_BY_ROLE[me.role]);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const submit = (event) => {
    event.preventDefault();
    if (token) {
      if (password !== confirm) return setError("Les deux mots de passe ne correspondent pas.");
      return run(() => api("/confirm", { method: "POST", body: { token, password } }));
    }
    return run(() => api("/login", { method: "POST", body: { email, password } }));
  };

  return (
    <main className="page page-narrow">
      <section className="panel stack" aria-labelledby="login-title">
        <h1 id="login-title">{token ? "Activer mon compte" : "Connexion"}</h1>
        <p className="muted">
          {token
            ? "Choisissez le mot de passe de votre compte. Vous serez connecté juste après."
            : "Habitants : utilisez le mail donné à votre mairie. À la première connexion, vous choisissez votre mot de passe (un lien de confirmation peut vous être envoyé par mail)."}
        </p>
        <form className="admin-form admin-form-single" onSubmit={submit}>
          {!token && (
            <label>
              Mail
              <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
          )}
          <label>
            {token ? "Nouveau mot de passe" : "Mot de passe"}
            <input
              type="password"
              autoComplete={token ? "new-password" : "current-password"}
              required
              minLength={token ? 6 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {token && (
            <label>
              Confirmer le mot de passe
              <input type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </label>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <div className="notice" role="status">
              <p>{notice}</p>
            </div>
          )}
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? "Un instant…" : token ? "Activer mon compte" : "Se connecter"}
          </button>
        </form>
        {token && (
          <p className="muted">
            Compte déjà activé ou lien expiré ?{" "}
            <a
              href="/connexion"
              onClick={(event) => {
                event.preventDefault();
                window.history.replaceState(null, "", "/connexion");
                setToken(null);
                setError(null);
                setPassword("");
                setConfirm("");
              }}
            >
              Se connecter avec son mail
            </a>
          </p>
        )}
      </section>
    </main>
  );
}
