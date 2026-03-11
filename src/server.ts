import "dotenv/config";
import app from "./app";
import { startReminderScheduler } from "./services/reminderService";

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  startReminderScheduler();
});

export default app;
