console.log('server/index.ts: file loaded');
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic, log } from "./vite.js";
import { DrizzleStorage, type IStorage } from "./storage.js";
import type { Server } from "http";

// CORS middleware
function enableCORS(req: Request, res: Response, next: NextFunction) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
}

let server: Server | null = null;
let storage: IStorage | null = null;

export async function startServer(dbName?: string): Promise<{ app: express.Application; server: Server; port: number, storage: IStorage }> {
  console.log('Starting backend server...');
  try {
    storage = new DrizzleStorage(dbName);
    console.log('DrizzleStorage instance created');
    // Wait for database initialization to complete
    await storage.initializeDatabase();
    console.log('Database initialized');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
  const app = express();
  app.use(enableCORS);
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;

        if (req.body && Object.keys(req.body).length > 0) {
          logLine += `\n  body: ${JSON.stringify(req.body)}`;
        }

        if (capturedJsonResponse) {
          logLine += `\n  response: ${JSON.stringify(capturedJsonResponse)}`;
        }

        log(logLine);
      }
    });

    next();
  });

  const httpServer = await registerRoutes(app, storage);
  server = httpServer;

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || '5000', 10);

  return new Promise((resolve, reject) => {
    server!.listen(port, "0.0.0.0", () => {
      log(`serving on http://0.0.0.0:${port}`);
      console.log(`Backend is listening on http://0.0.0.0:${port}`);
      console.log(`Health endpoint available at: http://0.0.0.0:${port}/health`);
      resolve({ app, server: server!, port, storage: storage! });
    }).on('error', (error) => {
      console.error('Server failed to start:', error);
      reject(error);
    });
  });
}

export async function stopServer(): Promise<void> {
  if (storage) {
    await storage.close();
  }
  return new Promise((resolve, reject) => {
      if (server) {
          server.close((err) => {
              if (err) {
                  return reject(err);
              }
              log('Server stopped');
              resolve();
          });
      } else {
          resolve();
      }
  });
}

// Always start the server if this file is run directly
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  startServer().then(({ port }) => {
    console.log(`✅ Server started successfully on port ${port}`);
  }).catch((error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  });
}