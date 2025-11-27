import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { type Server } from "http";
import { log } from "./log";
// import viteConfig from "../vite.config"; // Removed to avoid vite dependency in production
// import { nanoid } from "nanoid"; // Moved to dynamic import inside development block

// const viteLogger = createLogger(); // Moved inside development block

// log is intentionally moved into server/log.ts and imported to avoid
// a situation where vite module initialization is delayed and `log` is not
// available when index.ts executes early during startup. This ensures
// the server can call `log` synchronously during boot.

export async function setupVite(app: Express, server: Server) {
  // In production, this function does nothing - vite is not needed
  if (process.env.NODE_ENV === "development") {
    // Dynamically import vite and config only in development
    const { createServer: createViteServer } = await import("vite");
    const viteConfig = (await import("../vite.config")).default;

    const viteLogger = {
      info: (...args: any[]) => console.info(...args),
      warn: (...args: any[]) => console.warn(...args),
      warnOnce: (msg: string) => console.warn(`[once] ${msg}`),
      error: (msg: any, options?: any) => {
        console.error(msg, options);
        process.exit(1);
      },
      clear: () => {},
      clearScreen: () => {},
      has: (_level: string) => true,
      hasErrorLogged: (_error: any) => false,
      hasWarned: false,
    } as const;

    const serverOptions = {
      middlewareMode: true,
      hmr: { server },
      allowedHosts: true as const,
    };

    const vite = await createViteServer({
      ...viteConfig,
      configFile: false,
      customLogger: {
        ...viteLogger,
        error: (msg: any, options?: any) => {
          viteLogger.error(msg, options);
          process.exit(1);
        },
      },
      server: serverOptions,
      appType: "custom",
    });

    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;

      try {
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const clientTemplate = path.resolve(__dirname, "..", "client", "index.html");

        // always reload the index.html file from disk incase it changes
        let template = await fs.promises.readFile(clientTemplate, "utf-8");
        template = template.replace(
          `src="/src/main.tsx"`,
          `src="/src/main.tsx?v=${Date.now()}"`,
        );
        const page = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(page);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  }
  // In production, do nothing - static files are served by serveStatic
}

export function serveStatic(app: Express) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  // production build outputs the client into `dist/public`
  const distPath = path.resolve(__dirname, "..", "dist", "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist, but exclude API routes
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
