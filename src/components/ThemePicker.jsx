import { THEMES } from "../themes";
import { CUSTOM_THEME, customSwatches } from "../lib/customTheme";

/**
 * Choix du design de la page publique d'une ville : une carte par design, avec ses couleurs.
 * `previewSlug` : si fourni, chaque carte propose un aperçu de la vraie page dans un nouvel onglet.
 * `custom` : design personnalisé enregistré par la mairie, proposé comme option supplémentaire.
 */
export function ThemePicker({ value, onChange, previewSlug, name = "theme", custom = null }) {
  const options = custom
    ? [...THEMES, { id: CUSTOM_THEME, name: `Mon design : ${custom.name}`, description: custom.description || "Design personnalisé de la mairie.", swatches: customSwatches(custom) }]
    : THEMES;
  return (
    <fieldset className="theme-picker">
      <legend className="visually-hidden">Design de la page publique</legend>
      {options.map((theme) => {
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
                {theme.swatches.map((color, i) => (
                  <span key={i} style={{ background: color }} />
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
