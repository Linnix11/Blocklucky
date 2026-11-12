import { Fraunces, Public_Sans, Source_Serif_4 } from "next/font/google";
import { Shell } from "@/components/Shell";
import "@/tokens.css";
import "@/styles.css";
import "@/themes.css";

/**
 * Polices téléchargées au build et servies par notre serveur (next/font) : le navigateur n'appelle
 * jamais Google, aucune adresse IP de visiteur ne lui est transmise (RGPD).
 */
const publicSans = Public_Sans({ subsets: ["latin"], variable: "--font-public-sans", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" });
const sourceSerif = Source_Serif_4({ subsets: ["latin"], variable: "--font-source-serif", display: "swap" });

export const metadata = {
  title: "BlockLucky, la loterie des villes",
  description: "BlockLucky, la loterie des villes : un tirage transparent et vérifiable sur la blockchain.",
  // Icônes : src/app/icon.png (onglet) et src/app/apple-icon.png (écran d'accueil iPhone), lues par Next.js.
};

export const viewport = { themeColor: "#ffffff" };

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={`${publicSans.variable} ${fraunces.variable} ${sourceSerif.variable}`}>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
