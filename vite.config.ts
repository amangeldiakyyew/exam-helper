import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";
import { defineConfig } from "vite";
import electron from "vite-plugin-electron/simple";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        // Shortcut of `build.lib.entry`.
        entry: "electron/main.ts",
        onstart({ startup }) {
          startup();
        },
        vite: {
          build: {
            rollupOptions: {
              external: ["electron"],
            },
          },
          plugins: [
            {
              name: "copy-pdf-worker",
              closeBundle() {
                const workerSrc = path.join(
                  __dirname,
                  "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"
                );
                const workerDest = path.join(__dirname, "dist-electron/pdf.worker.mjs");
                
                if (fs.existsSync(workerSrc)) {
                  fs.copyFileSync(workerSrc, workerDest);
                  console.log("✓ Copied pdf.worker.mjs to dist-electron");
                }
              },
            },
          ],
        },
      },
      preload: {
        // Shortcut of `build.rollupOptions.input`.
        // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
        input: path.join(__dirname, "electron/preload.ts"),
      },
      // Ployfill the Electron and Node.js API for Renderer process.
      // If you want use Node.js in Renderer process, the `nodeIntegration` needs to be enabled in the Main process.
      // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
      renderer:
        process.env.NODE_ENV === "test"
          ? // https://github.com/electron-vite/vite-plugin-electron-renderer/issues/78#issuecomment-2053600808
            undefined
          : {},
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      external: ["electron", "pdf-parse"], // This ensures electron modules are externalized
    },
  },
});