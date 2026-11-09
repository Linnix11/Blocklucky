import { Shell } from "@/components/Shell";
import "@/tokens.css";
import "@/styles.css";

/** Icône d'onglet : un billet de tombola or, talon lie-de-vin perforé. */
const TICKET_ICON =
  "data:image/svg+xml," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>" +
      "<path d='M3 8h26v5a3 3 0 0 0 0 6v5H3v-5a3 3 0 0 0 0-6z' fill='#f6b93b'/>" +
      "<path d='M22 8h7v5a3 3 0 0 0 0 6v5h-7z' fill='#b3263e'/>" +
      "<path d='M22 10v12' stroke='#1b1230' stroke-width='1.5' stroke-dasharray='2 2'/>" +
      "</svg>"
  );

export const metadata = {
  title: "BlockLucky, la loterie des villes",
  description: "BlockLucky, la loterie des fêtes des villes : un tirage transparent et vérifiable sur la blockchain.",
  icons: { icon: TICKET_ICON },
};

export const viewport = { themeColor: "#1B1230" };

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Bricolage+Grotesque:opsz,wght@12..96,500..800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
