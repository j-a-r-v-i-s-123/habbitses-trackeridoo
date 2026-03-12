import { Router, Response } from "express";
import rateLimit from "express-rate-limit";
import prisma from "../db";
import { authenticateToken, AuthRequest } from "../middleware/auth";

const router = Router();

const isTest = process.env.NODE_ENV === "test";

const reminderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTest ? 1000 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

router.use(authenticateToken);
router.use(reminderLimiter);

function isValidTime(time: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
}

// GET /api/reminders - get reminder settings for all user habits
router.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const habits = await prisma.habit.findMany({
      where: { userId: req.userId!, archived: false },
      select: {
        id: true,
        name: true,
        reminderEnabled: true,
        reminderTime: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ reminders: habits });
  } catch (err) {
    console.error("Get reminders error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/reminders/:habitId - update reminder settings for a habit
router.put("/:habitId", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const habitId = req.params.habitId as string;
    const { reminderEnabled, reminderTime } = req.body;

    const habit = await prisma.habit.findFirst({
      where: { id: habitId, userId: req.userId! },
    });
    if (!habit) {
      res.status(404).json({ error: "Habit not found" });
      return;
    }

    if (reminderEnabled && reminderTime && !isValidTime(reminderTime)) {
      res.status(400).json({ error: "Invalid time format. Use HH:MM (24h)" });
      return;
    }

    const updated = await prisma.habit.update({
      where: { id: habitId },
      data: {
        reminderEnabled: reminderEnabled ?? habit.reminderEnabled,
        reminderTime: reminderEnabled ? (reminderTime ?? habit.reminderTime ?? "09:00") : habit.reminderTime,
      },
      select: {
        id: true,
        name: true,
        reminderEnabled: true,
        reminderTime: true,
      },
    });

    res.json({ reminder: updated });
  } catch (err) {
    console.error("Update reminder error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
