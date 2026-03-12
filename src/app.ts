import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import authRoutes from "./routes/auth";
import habitRoutes from "./routes/habits";
import checkInRoutes from "./routes/check-ins";
import analyticsRoutes from "./routes/analytics";
import reminderRoutes from "./routes/reminders";

const app = express();

const corsOrigin = process.env.CORS_ORIGIN || true; // restrict in production via CORS_ORIGIN env var
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Serve static frontend files (Vite build output or public folder)
const clientDistPath = path.join(__dirname, "../client/dist");
const publicPath = path.join(__dirname, "../public");
app.use(express.static(clientDistPath));
app.use(express.static(publicPath));

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/habits", habitRoutes);
app.use("/api/check-ins", checkInRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/reminders", reminderRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// SPA fallback: serve index.html for non-API routes
app.get("*", (_req, res) => {
  const indexPath = path.join(clientDistPath, "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    const publicIndex = path.join(publicPath, "index.html");
    if (fs.existsSync(publicIndex)) {
      res.sendFile(publicIndex);
    } else {
      res.status(404).json({ error: "Not found" });
    }
  }
});

export default app;
