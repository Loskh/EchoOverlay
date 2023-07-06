import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/EchoOverlay/Zodiark/",
  build: {
    outDir: "./dist",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        zodiark: resolve(__dirname, "zodiark.html"),
      },
    },
  },
});
