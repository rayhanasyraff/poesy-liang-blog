import express from "express";
import wpPostRoutes from "./routes/wpPostRoutes";
import blogRoutes from "./routes/blogRoutes";
import migrationRoutes from "./routes/migrationRoutes";
import { corsMiddleware } from "./middlewares/cors";
import { config } from "./config/config";

const PORT = config.port;

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

app.listen(PORT, () => {
  console.log(`🚀 Blog API Server running at http://localhost:${PORT}`);
});
