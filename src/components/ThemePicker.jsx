import { THEMES } from "../themes";

/**
 * Choix du design de la page publique d'une ville : une carte par design, avec ses couleurs.
 * `previewSlug` : si fourni, chaque carte propose un aperçu de la vraie page dans un nouvel onglet.
 */
export function ThemePicker({ value, onChange, previewSlug, name = "theme" }) {
  return (
    <fieldset className="theme-picker">
      <legend className="visually-hidden">Design de la page publique</legend>
      {THEMES.map((theme) => {
        const id = `${name}-${theme.id}`;
        return (
          <div key={theme.id} className="theme-option">
            <input
              type="radio"
              id={id}
              name={name}
              value={theme.id}
              checked={value === theme.id}
              onChange={() => onChange(theme.id)}
            />
            <label htmlFor={id}>
              <span className="theme-swatches" aria-hidden="true">
                {theme.swatches.map((color) => (
                  <span key={color} style={{ background: color }} />
                ))}
              </span>
              <span className="theme-text">
                <span className="theme-name">
                  {theme.name}
                  {theme.id === "sobre" && <span className="theme-default"> (par défaut)</span>}
                </span>
                <span className="theme-description">{theme.description}</span>
              </span>
            </label>
            {previewSlug && (
              <a
                className="theme-preview"
                href={`/ville/${previewSlug}?design=${theme.id}`}
                target="_blank"
                rel="noreferrer"
                aria-label={`Aperçu du design ${theme.name} (nouvel onglet)`}
              >
                Aperçu
              </a>
            )}
          </div>
        );
      })}
    </fieldset>
  );
}
