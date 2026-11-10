/** Passage à compléter par la mairie ou l'éditeur avant mise en production (surligné à l'écran). */
export function Todo({ children }) {
  return <span className="todo">[À compléter : {children}]</span>;
}
