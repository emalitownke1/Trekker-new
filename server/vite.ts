import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { type Server } from "http";
import { nanoid } from "nanoid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  // In production, serve static files instead of using vite middleware
  if (process.env.NODE_ENV === 'production') {
    log("Setting up production static file serving");
    return serveStatic(app);
  }

  log("Setting up development vite middleware");

  // Dynamic imports to avoid loading vite in production
  const { createServer: createViteServer, createLogger } = await import("vite");
  const userCfgExport = (await import("../vite.config")).default;

  // Resolve the config function to get the actual configuration
  const userCfg = typeof userCfgExport === "function"
    ? userCfgExport({ mode: process.env.NODE_ENV === "production" ? "production" : "development", command: "serve" })
    : userCfgExport;

  const viteLogger = createLogger();

  const vite = await createViteServer({
    ...userCfg,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: {
      ...userCfg.server,
      middlewareMode: true,
      hmr: { 
        server,
        host: "0.0.0.0",
        clientPort: 5000 
      },
      host: "0.0.0.0",
      allowedHosts: true,
      cors: true,
    },
    appType: "custom",
  });

  app.use(vite.middlewares);
  // Only serve HTML for non-API routes to prevent API endpoints from returning HTML
  app.get("*", async (req, res, next) => {
    const url = req.originalUrl;

    // Skip API routes - let them be handled by the registered API routes
    if (url.startsWith('/api/') || url.startsWith('/ws')) {
      return next();
    }

    try {
      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "..", "dist", "public");

  if (!fs.existsSync(distPath)) {
    console.error(`❌ Static files directory not found: ${distPath}`);
    console.error('Please run "yarn build" to generate static files');

    // Provide a fallback response for production deployments
    app.get("*", (req, res, next) => {
      const url = req.originalUrl;

      // Skip API routes, health checks, and WebSocket connections
      if (url.startsWith('/api/') || 
          url.startsWith('/ws') || 
          url.startsWith('/health') ||
          url.startsWith('/ready') ||
          url.startsWith('/alive') ||
          url.startsWith('/internal/')) {
        return next();
      }

      res.status(503).send(`
        <html>
          <head><title>Application Not Built</title></head>
          <body>
            <h1>Application Not Built</h1>
            <p>Please run "yarn build" to generate static files.</p>
          </body>
        </html>
      `);
    });
    return;
  }

  log(`📁 Serving static files from: ${distPath}`);

  // Serve static files with proper caching headers
  app.use(express.static(distPath, {
    maxAge: '1d',
    etag: true,
    lastModified: true,
  }));

  // Handle SPA routing - serve index.html for non-API routes
  app.get("*", (req, res, next) => {
    const url = req.originalUrl;

    // Skip API routes, health checks, and WebSocket connections
    if (url.startsWith('/api/') || 
        url.startsWith('/ws') || 
        url.startsWith('/health') ||
        url.startsWith('/ready') ||
        url.startsWith('/alive') ||
        url.startsWith('/internal/')) {
      return next();
    }

    // Serve index.html for all other routes (SPA routing)
    const indexPath = path.join(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Index file not found. Please run "yarn build" first.');
    }
  });
}