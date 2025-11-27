import { defineConfig } from "vite";
import path from "path";
import { fileURLToPath } from "url";
let runtimeErrorOverlay: any = null;
try {
  runtimeErrorOverlay = (await import("@replit/vite-plugin-runtime-error-modal")).default || (await import("@replit/vite-plugin-runtime-error-modal"));
} catch (err) {
  // plugin might not be present in CI; continue without it
  console.warn("@replit/vite-plugin-runtime-error-modal not available during Vite config load; continuing without it.", err?.message || err);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Attempt to dynamically import the React plugin. In some CI/build
// environments the plugin may not be available (or installation may
// behave differently). Make the config resilient so the build can
// proceed even if the plugin isn't present.
let reactPlugin = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = await import("@vitejs/plugin-react");
  reactPlugin = mod && typeof mod.default === "function" ? mod.default() : null;
} catch (err) {
  // Don't hard-fail here; log and continue without the plugin.
  // Production builds may still succeed without the plugin in CI.
  // If React-specific transforms are required, ensure the package
  // is present in the lockfile and installed during CI.
  // eslint-disable-next-line no-console
  console.warn("@vitejs/plugin-react not available during Vite config load; continuing without it.", err?.message || err);
}

export default defineConfig({
  plugins: [
    ...(reactPlugin ? [reactPlugin] : []),
    ...(runtimeErrorOverlay ? [runtimeErrorOverlay()] : []),
    ...(process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) => m.cartographer()),
          await import("@replit/vite-plugin-dev-banner").then((m) => m.devBanner()),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist", "public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
