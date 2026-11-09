import { Shell } from "@/components/Shell";
import "@/tokens.css";
import "@/styles.css";

/** Icône d'onglet : un jeton de casino rouge et crème. */
const CHIP_ICON =
  "data:image/svg+xml," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>" +
      "<circle cx='16' cy='16' r='15' fill='#e8202a'/>" +
      "<circle cx='16' cy='16' r='15' fill='none' stroke='#fff4e0' stroke-width='4' stroke-dasharray='5 7'/>" +
      "<circle cx='16' cy='16' r='8' fill='#ffcc33'/>" +
      "</svg>"
  );

export const metadata = {
  title: "BlockLucky, la loterie des villes",
  description: "BlockLucky, la loterie des villes : un tirage transparent et vérifiable sur la blockchain.",
  icons: { icon: CHIP_ICON },
};

export const viewport = { themeColor: "#120707" };

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Bungee&family=Bungee+Shade&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
