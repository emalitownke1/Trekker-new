import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
// import { setupVite, serveStatic, log } from "./vite"; // Temporarily disabled - vite package removed
function log(message: string, source = "express") { console.log(`${new Date().toLocaleTimeString()} [${source}] ${message}`); }
import { initializeDatabase, getServerName } from "./db";
import { fileURLToPath } from 'url';
import path from 'path';
import "./services/enhanced-commands";

// Guard to prevent double-start of monitoring
let monitoringStarted = false;

// Start monitoring once with guard
async function startMonitoringOnce() {
  if (monitoringStarted) return;
  monitoringStarted = true;
  
  try {
    await startScheduledBotMonitoring();
  } catch (error) {
    console.error('❌ Failed to start monitoring:', error);
  }
}

// Scheduled bot monitoring function
async function startScheduledBotMonitoring() {
  try {
    console.log('🕒 Starting scheduled bot monitoring (every 3 minutes)');
    
    const { storage } = await import('./storage');
    const { botManager } = await import('./services/bot-manager');
    
    console.log('✅ Scheduled monitoring imports loaded successfully');
  
  const checkApprovedBots = async () => {
    try {
      // Get all approved bots that should be auto-started
      const approvedBots = await storage.getBotInstancesForAutoStart();
      
      if (approvedBots.length === 0) {
        return;
      }
      
      for (const bot of approvedBots) {
        try {
          // Check if bot is in the bot manager and its status
          const existingBot = botManager.getBot(bot.id);
          const isOnline = existingBot?.getStatus() === 'online';
          
          if (!existingBot || !isOnline) {
            // Create activity log
            await storage.createActivity({
              botInstanceId: bot.id,
              type: 'monitoring',
              description: 'Bot restarted by scheduled monitoring - was offline or not found',
              serverName: bot.serverName
            });
            
            // Start the bot
            if (!existingBot) {
              await botManager.createBot(bot.id, bot);
            }
            await botManager.startBot(bot.id);
          }
        } catch (error) {
          // Log the error as an activity
          await storage.createActivity({
            botInstanceId: bot.id,
            type: 'error',
            description: `Scheduled monitoring failed to restart bot: ${error instanceof Error ? error.message : 'Unknown error'}`,
            serverName: bot.serverName
          });
        }
      }
    } catch (error) {
      // Silent error handling
    }
  };
  
  // Initial check after 30 seconds
  setTimeout(checkApprovedBots, 30000);
  
  // Schedule checks every 3 minutes (180,000 milliseconds)
  setInterval(checkApprovedBots, 180000);
  
  } catch (error) {
    console.error('❌ Failed to start scheduled bot monitoring:', error);
  }
}

const app = express();
app.use(express.json({ limit: '7mb' }));
app.use(express.urlencoded({ extended: false, limit: '7mb' }));

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
    // Skip logging HEAD requests to /api (health checks) and other non-meaningful requests
    if (path.startsWith("/api") && !(req.method === "HEAD" && path === "/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {

  // Comprehensive startup health checks
  console.log('🔄 Starting application initialization...');
  
  try {
    // Initialize database (create tables if they don't exist)
    console.log('🔄 Initializing database...');
    await initializeDatabase();
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
  
  try {
    // Initialize offer system
    console.log('🔄 Initializing offer management system...');
    const { offerManager } = await import('./services/offer-manager');
    await offerManager.initializeOfferSystem();
    console.log('✅ Offer management system initialized');
  } catch (error) {
    console.error('❌ Offer system initialization failed:', error);
    process.exit(1);
  }
  
  // Automatic bot monitoring has been disabled
  // Bots should be manually restarted through the GUI at guest/bot-management
  console.log('ℹ️ Automatic bot monitoring is disabled - use GUI for bot management');
  
  // Test critical services
  try {
    console.log('🔄 Testing storage service...');
    const { storage } = await import('./storage');
    await storage.getDashboardStats();
    console.log('✅ Storage service operational');
  } catch (error) {
    console.error('❌ Storage service test failed:', error);
    process.exit(1);
  }
  
  try {
    console.log('🔄 Testing bot manager...');
    const { botManager } = await import('./services/bot-manager');
    botManager.getAllBotStatuses(); // This should not throw
    console.log('✅ Bot manager operational');
  } catch (error) {
    console.error('❌ Bot manager test failed:', error);
    process.exit(1);
  }
  
  console.log('✅ All critical systems initialized successfully');
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Setup static file serving for built production files
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const distPath = path.join(__dirname, '..', 'dist', 'public');
  
  // Check if build files exist
  if (!require('fs').existsSync(distPath)) {
    console.error('❌ Build files not found. Please run "yarn build" first.');
    process.exit(1);
  }
  
  // Serve built static assets with proper headers
  app.use('/assets', express.static(path.join(distPath, 'assets'), {
    maxAge: '1y',
    etag: true,
    lastModified: true
  }));
  
  // Serve static files from dist/public with caching
  app.use(express.static(distPath, {
    maxAge: '1d',
    etag: true,
    lastModified: true,
    index: false // Don't serve index.html automatically
  }));
  
  // Handle client-side routing - serve index.html for any route that doesn't start with /api
  app.get('*', (req, res, next) => {
    const path = req.path;
    
    // Skip API routes, health checks, WebSocket connections, and static assets
    if (path.startsWith('/api') || 
        path.startsWith('/health') || 
        path.startsWith('/ws') ||
        path.startsWith('/assets/')) {
      return next();
    }
    
    // Serve index.html for all client routes
    const indexPath = path.join(distPath, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error('Error serving index.html:', err);
        res.status(500).send('Error loading application');
      }
    });
  });

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Google Cloud Run expects port 8080, Replit uses 5000
  // Default to 5000 for Replit, but respect PORT environment variable for Cloud Run
  const port = parseInt(process.env.PORT || '5000', 10);
  
  // Add startup health check
  console.log(`🚀 Starting server on port ${port}`);
  console.log(`🏷️ Server name: ${getServerName()}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💾 Memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
  
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`✅ Server ready and listening on port ${port}`);
    log(`🔗 Health check available at: http://0.0.0.0:${port}/health`);
    log(`📊 System info available at: http://0.0.0.0:${port}/api/system/info`);
    
    // Log startup success
    setTimeout(async () => {
      try {
        const { storage } = await import('./storage');
        await storage.createCrossTenancyActivity({
          type: 'server_startup',
          description: `Server ${getServerName()} started successfully on port ${port}`,
          metadata: { 
            port,
            environment: process.env.NODE_ENV || 'development',
            memoryUsage: process.memoryUsage(),
            uptime: process.uptime()
          },
          serverName: getServerName(),
          remoteTenancy: undefined
        });
      } catch (error) {
        console.log('Could not log startup activity:', error);
      }
    }, 2000);
  });

  // Graceful shutdown handling for containerized environments
  const gracefulShutdown = async (signal: string) => {
    log(`${signal} received, shutting down gracefully`);
    
    // Cleanup offer manager
    const { offerManager } = await import('./services/offer-manager');
    offerManager.cleanup();
    
    server.close((err) => {
      if (err) {
        log(`Error during server shutdown: ${err.message}`);
        process.exit(1);
      }
      log('Server closed successfully');
      process.exit(0);
    });
    
    // Force shutdown after 10 seconds
    setTimeout(() => {
      log('Force shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));

})().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
