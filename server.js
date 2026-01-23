// @ts-check

import "dotenv/config";
import express from "express";
import compression from "compression";
import statsCard from "./api/index.js";
import repoCard from "./api/pin.js";
import langCard from "./api/top-langs.js";
import wakatimeCard from "./api/wakatime.js";
import gistCard from "./api/gist.js";
import { getRedisClient, isRedisHealthy, closeRedis } from "./src/common/redis.js";

const app = express();

// Enable gzip compression
app.use(compression());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// CORS headers for broader compatibility
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Health check endpoints for Kubernetes probes
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.get("/healthz", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// Readiness probe - checks Redis connectivity if configured
// Always returns ready (200) - Redis is optional for caching
app.get("/ready", async (req, res) => {
  let redisStatus = "not configured";
  if (process.env.REDIS_HOST) {
    try {
      // Timeout isRedisHealthy to prevent probe from hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 2000)
      );
      const healthyPromise = isRedisHealthy();
      const redisHealthy = await Promise.race([healthyPromise, timeoutPromise]).catch(() => false);
      redisStatus = redisHealthy ? "connected" : "disconnected";
    } catch {
      redisStatus = "disconnected";
    }
  }
  res.json({
    status: "ready",
    timestamp: new Date().toISOString(),
    redis: redisStatus,
  });
});

app.get("/readyz", async (req, res) => {
  try {
    const redisHealthy = await isRedisHealthy();
    res.json({
      status: "ready",
      redis: redisHealthy ? "ok" : "unavailable",
    });
  } catch (err) {
    res.status(503).json({
      status: "not ready",
      error: err.message,
    });
  }
});

// API routes
const router = express.Router();

router.get("/", statsCard);
router.get("/pin", repoCard);
router.get("/top-langs", langCard);
router.get("/wakatime", wakatimeCard);
router.get("/gist", gistCard);

app.use("/api", router);

// Also serve at root for compatibility
app.get("/", (req, res) => {
  // If there are query params, treat as stats card request
  if (Object.keys(req.query).length > 0) {
    return statsCard(req, res);
  }
  // Otherwise return info
  res.json({
    name: "github-readme-stats",
    version: "1.0.0",
    endpoints: [
      "/api - Stats card",
      "/api/pin - Repository pin card",
      "/api/top-langs - Top languages card",
      "/api/wakatime - WakaTime card",
      "/api/gist - Gist card",
      "/health - Health check",
      "/ready - Readiness check",
    ],
  });
});

// Start server
const port = process.env.PORT || process.env.port || 9000;
const server = app.listen(port, "0.0.0.0", async () => {
  console.log(`github-readme-stats server running on port ${port}`);

  // Initialize Redis connection if configured
  if (process.env.REDIS_HOST) {
    console.log(`Connecting to Redis at ${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}`);
    await getRedisClient();
  }
});

// Graceful shutdown handler
const shutdown = async (signal) => {
  console.log(`\n${signal} received, shutting down gracefully...`);

  // Close server first (stop accepting new requests)
  server.close(async () => {
    console.log("HTTP server closed");

    // Close Redis connection
    await closeRedis();

    console.log("Shutdown complete");
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    console.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export default app;
