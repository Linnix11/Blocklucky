import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // ethers.js dans un fichier séparé : mis en cache par le navigateur entre deux mises en ligne
        manualChunks: { ethers: ["ethers"] },
      },
    },
  },
});
