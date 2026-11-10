import { Shell } from "@/components/Shell";
import "@/tokens.css";
import "@/styles.css";
import "@/themes.css";

/** Icône d'onglet : un ticket de tombola bleu. */
const TICKET_ICON =
  "data:image/svg+xml," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>" +
      "<path d='M4 8a2 2 0 0 1 2-2h20a2 2 0 0 1 2 2v4a4 4 0 0 0 0 8v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4a4 4 0 0 0 0-8z' fill='#1F4E8C'/>" +
      "<circle cx='13' cy='16' r='3.2' fill='#fff'/>" +
      "</svg>"
  );

export const metadata = {
  title: "BlockLucky, la loterie des villes",
  description: "BlockLucky, la loterie des villes : un tirage transparent et vérifiable sur la blockchain.",
  icons: { icon: TICKET_ICON },
};

export const viewport = { themeColor: "#ffffff" };

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Public+Sans:wght@400;600;700&family=Source+Serif+4:opsz,wght@8..60,600;8..60,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
