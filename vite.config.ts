import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        app: fileURLToPath(new URL("index.html", import.meta.url)),
        preview: fileURLToPath(new URL("preview.html", import.meta.url)),
      },
    },
  },
  plugins: [react()],
});
