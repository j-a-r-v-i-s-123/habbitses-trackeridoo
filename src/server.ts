import "dotenv/config";
import app from "./app";
import { startReminderScheduler } from "./services/reminderService";

const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === "production";

// Validate required environment variables
function validateEnv() {
  if (isProduction && !process.env.JWT_SECRET) {
    console.error("FATAL: JWT_SECRET environment variable is required in production");
    process.exit(1);
  }

  if (!process.env.JWT_SECRET) {
    console.warn("WARNING: JWT_SECRET not set — using insecure default. Set JWT_SECRET for production.");
  }

  if (!process.env.DATABASE_URL) {
    console.warn("WARNING: DATABASE_URL not set — using default. Set DATABASE_URL for production.");
  }

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.warn("WARNING: SMTP credentials not configured — email reminders will not work.");
  }
}

validateEnv();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  startReminderScheduler();
});

export default app;
