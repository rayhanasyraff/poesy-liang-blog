import express from "express";
import wpPostRoutes from "./routes/wpPostRoutes";
import blogRoutes from "./routes/blogRoutes";
import migrationRoutes from "./routes/migrationRoutes";
import { corsMiddleware } from "./middlewares/cors";
import { config } from "./config/config";
import { Server } from "http";
import { writePortInfo } from "./utils/port-manager";

let PORT = config.port;

const app = express();

// Middleware
app.use(express.json());
app.use(corsMiddleware);

// Routes
app.use("/", wpPostRoutes);
app.use("/", blogRoutes);
app.use("/", migrationRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found"
  });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response) => {
  console.error("API Error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error"
  });
});

// Function to find available port
async function startServer(port: number, fallbackPorts: number[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    const server = app.listen(port)
      .on('listening', () => {
        console.log(`🚀 Blog API Server running at http://localhost:${port}`);
        writePortInfo(port);
        resolve();
      })
      .on('error', async (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`⚠️  Port ${port} is already in use.`);

          // Try fallback ports
          if (fallbackPorts.length > 0) {
            const nextPort = fallbackPorts[0];
            const remainingPorts = fallbackPorts.slice(1);
            console.log(`Trying port ${nextPort}...`);

            // Close server before trying next port
            try {
              await new Promise<void>((resolveClose) => {
                server.close(() => resolveClose());
              });
            } catch (closeErr) {
              // Ignore close errors
            }

            // Try next port
            try {
              await startServer(nextPort, remainingPorts);
              resolve();
            } catch (nextErr) {
              reject(nextErr);
            }
          } else {
            console.error('❌ All fallback ports are in use. Please free up a port or specify a different PORT environment variable.');
            reject(err);
          }
        } else {
          reject(err);
        }
      });
  });
}

// Start server with fallback ports
startServer(PORT, config.fallbackPorts.slice(1)).catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
