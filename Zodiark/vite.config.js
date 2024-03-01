import { resolve } from "path";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  base: "/EchoOverlay/Zodiark/",
  build: {
    outDir: "./dist",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "zodiark.html"),
      },
    },
  },
  plugins: [viteSingleFile()],
});
