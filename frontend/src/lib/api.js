/** Appel à l'API du serveur (cookies de session inclus). Lève une Error avec le message du serveur. */
export async function api(path, { method = "GET", body } = {}) {
  const response = await fetch(`/api${path}`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "same-origin",
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || `Erreur ${response.status}`);
  return data;
}
