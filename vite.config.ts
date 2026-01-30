import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  base: "/MinecraftWebNew/",
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "@core": resolve(__dirname, "src/core"),
      "@world": resolve(__dirname, "src/world"),
      "@player": resolve(__dirname, "src/player"),
      "@ui": resolve(__dirname, "src/ui"),
      "@inventory": resolve(__dirname, "src/inventory"),
      "@input": resolve(__dirname, "src/input"),
      "@save": resolve(__dirname, "src/save"),
      "@utils": resolve(__dirname, "src/utils"),
    },
  },
  server: {
    port: 3000,
    open: true,
    watch: {
      usePolling: true,
      interval: 100,
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
