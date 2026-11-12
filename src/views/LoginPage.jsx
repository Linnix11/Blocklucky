"use client";

import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useRouter } from "next/navigation";

const HOME_BY_ROLE = { admin: "/admin", mairie: "/mairie", participant: "/" };

/** Textes de chaque écran : connexion, création, mot de passe oublié, activation (?jeton=…), nouveau mot de passe (?reinit=…). */
const MODES = {
  login: {
    title: "Connexion",
    intro:
      "Habitants : utilisez le mail donné à votre mairie. À la première connexion, vous choisissez votre mot de passe (un lien de confirmation peut vous être envoyé par mail).",
    submit: "Se connecter",
  },
  signup: {
    title: "Créer un compte",
    intro: "Réservé aux habitants inscrits par leur mairie : utilisez le mail que vous lui avez donné, puis choisissez votre mot de passe.",
    submit: "Créer mon compte",
  },
  forgot: {
    title: "Mot de passe oublié",
    intro: "Indiquez le mail de votre compte : nous vous envoyons un lien pour choisir un nouveau mot de passe.",
    submit: "Recevoir le lien",
  },
  activate: {
    title: "Activer mon compte",
    intro: "Choisissez le mot de passe de votre compte. Vous serez connecté juste après.",
    submit: "Activer mon compte",
  },
  reset: {
    title: "Nouveau mot de passe",
    intro: "Choisissez votre nouveau mot de passe. Vous serez connecté juste après, et vos autres appareils seront déconnectés.",
    submit: "Enregistrer le mot de passe",
  },
};

/**
 * Connexion unique (admin, mairie, habitant), création de compte et mot de passe oublié.
 * Les liens reçus par mail ouvrent /connexion?jeton=… (activation) ou /connexion?reinit=… (nouveau mot de passe).
 */
export function LoginPage({ onLogin }) {
  const router = useRouter();
  const [mode, setMode] = useState("login");
  const [token, setToken] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  const fromLink = mode === "activate" || mode === "reset";
  const newPassword = fromLink || mode === "signup";
  const text = MODES[mode];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("jeton")) {
      setToken(params.get("jeton"));
      setMode("activate");
    } else if (params.get("reinit")) {
      setToken(params.get("reinit"));
      setMode("reset");
    }
  }, []);

  const go = (next) => {
    if (fromLink) window.history.replaceState(null, "", "/connexion");
    setMode(next);
    setToken(null);
    setError(null);
    setNotice(null);
    setPassword("");
    setConfirm("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
    if (newPassword && password !== confirm) return setError("Les deux mots de passe ne correspondent pas.");
    if (mode === "activate") return run(() => api("/confirm", { method: "POST", body: { token, password } }));
    if (mode === "reset") return run(() => api("/reset", { method: "POST", body: { token, password } }));
    if (mode === "forgot") return run(() => api("/reset", { method: "POST", body: { email } }));
    return run(() => api("/login", { method: "POST", body: { email, password, signup: mode === "signup" } }));
  };

  return (
    <main className="page page-narrow stack">
      <section className="panel stack" aria-labelledby="login-title">
        <h1 id="login-title">{text.title}</h1>
        <p className="muted">{text.intro}</p>
        <form className="admin-form admin-form-single" onSubmit={submit}>
          {!fromLink && (
            <label>
              Mail
              <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
          )}
          {mode !== "forgot" && (
            <label>
              {newPassword ? "Nouveau mot de passe" : "Mot de passe"}
              <input
                type="password"
                autoComplete={newPassword ? "new-password" : "current-password"}
                required
                minLength={newPassword ? 6 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
          )}
          {newPassword && (
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
            {busy ? "Un instant…" : text.submit}
          </button>
        </form>
        {mode === "login" && (
          <p className="muted">
            <button type="button" className="link-button" onClick={() => go("forgot")}>
              Mot de passe oublié ?
            </button>
          </p>
        )}
        {mode !== "login" && (
          <p className="muted">
            {mode === "activate" ? "Compte déjà activé ou lien expiré ? " : mode === "reset" ? "Lien expiré ? " : ""}
            <button type="button" className="link-button" onClick={() => go(mode === "reset" ? "forgot" : "login")}>
              {mode === "reset" ? "Refaire une demande" : "Retour à la connexion"}
            </button>
          </p>
        )}
      </section>
      {(mode === "login" || mode === "signup") && (
        <section className="panel stack" aria-labelledby="switch-title">
          <h2 id="switch-title">{mode === "signup" ? "Déjà un compte ?" : "Pas encore de compte ?"}</h2>
          <p className="muted">
            {mode === "signup"
              ? "Connectez-vous avec votre mail et votre mot de passe."
              : "Votre mairie vous a inscrit ? Créez votre compte en quelques secondes avec le mail que vous lui avez donné."}
          </p>
          <button type="button" className="btn btn-ghost btn-block" onClick={() => go(mode === "signup" ? "login" : "signup")}>
            {mode === "signup" ? "Se connecter" : "Créer un compte"}
          </button>
        </section>
      )}
    </main>
  );
}
