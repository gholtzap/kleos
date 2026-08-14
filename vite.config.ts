import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  build: {
    rollupOptions: {
      // preview.html is a dev-only component harness with mock data. The dev
      // server serves it from the project root; keep it out of the build so it
      // is never deployed.
      input: {
        app: fileURLToPath(new URL("index.html", import.meta.url)),
      },
    },
  },
  plugins: [react()],
});
