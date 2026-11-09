import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // En développement, l'API du serveur (npm start) répond sur le port 3000
  server: { proxy: { "/api": "http://localhost:3000" } },
  build: {
    rollupOptions: {
      output: {
        // ethers.js dans un fichier séparé : mis en cache par le navigateur entre deux mises en ligne
        manualChunks: { ethers: ["ethers"] },
      },
    },
  },
});
