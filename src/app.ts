import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import authRoutes from "./routes/auth";
import habitRoutes from "./routes/habits";
import checkInRoutes from "./routes/check-ins";
import analyticsRoutes from "./routes/analytics";
import reminderRoutes from "./routes/reminders";

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Serve static frontend files
app.use(express.static(path.join(__dirname, "../public")));

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

export default app;
