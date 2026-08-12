import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import stylex from "@stylexjs/unplugin";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig(({ mode }) => ({
  build: {
    rollupOptions: {
      input: {
        app: fileURLToPath(new URL("index.html", import.meta.url)),
        preview: fileURLToPath(new URL("preview.html", import.meta.url)),
      },
    },
  },
  plugins: [
    mode === "test"
      ? stylex.raw(
          {
            unstable_moduleResolution: { type: "commonJS", rootDir },
          },
          { framework: "vite" },
        )
      : stylex.vite({
          devMode: "css-only",
          unstable_moduleResolution: { type: "commonJS", rootDir },
        }),
    react(),
  ],
}));
