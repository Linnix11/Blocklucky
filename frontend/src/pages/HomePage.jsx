/** Accueil : la liste des villes qui ont leur loterie. */
export function HomePage({ cities }) {
  return (
    <main className="page">
      <div className="intro">
        <h1>La loterie des fêtes, tirée au sort sous les yeux de tous.</h1>
        <p className="network-tag">Choisissez votre ville pour voir sa loterie et participer.</p>
      </div>
      {cities === null ? (
        <p className="muted">Chargement…</p>
      ) : cities.length === 0 ? (
        <section className="panel">
          <p>Aucune ville n'a encore ouvert de loterie.</p>
        </section>
      ) : (
        <ul className="city-list">
          {cities.map((city) => (
            <li key={city.id}>
              <a className="panel city-card" href={`#/ville/${city.slug}`}>
                <span className="city-name">{city.name}</span>
                <span className="muted">Voir la loterie →</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
