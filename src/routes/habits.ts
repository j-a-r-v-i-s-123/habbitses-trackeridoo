import { Router, Response } from "express";
import prisma from "../db";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { calculateStreaks } from "../utils/streaks";

const router = Router();

router.use(authenticateToken);

const VALID_DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function isValidFrequency(freq: string): boolean {
  if (freq === "daily" || freq === "weekly") return true;
  const days = freq.split(",").map((d) => d.trim().toLowerCase());
  return days.length > 0 && days.every((d) => VALID_DAYS.includes(d));
}

// GET /api/habits
router.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const includeArchived = req.query.archived === "true";
    const habits = await prisma.habit.findMany({
      where: {
        userId: req.userId!,
        ...(includeArchived ? {} : { archived: false }),
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ habits });
  } catch (err) {
    console.error("List habits error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/habits
router.post("/", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description, frequency, color, icon } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      res.status(400).json({ error: "Name is required" });
      return;
    }

    if (frequency && !isValidFrequency(frequency)) {
      res.status(400).json({
        error: "Invalid frequency. Use 'daily', 'weekly', or comma-separated days",
      });
      return;
    }

    if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) {
      res.status(400).json({ error: "Invalid color format" });
      return;
    }

    const habit = await prisma.habit.create({
      data: {
        userId: req.userId!,
        name: name.trim(),
        description: description?.trim() || null,
        frequency: frequency || "daily",
        color: color || "#5b4fcf",
        icon: icon || "star",
      },
    });

    res.status(201).json({ habit });
  } catch (err) {
    console.error("Create habit error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/habits/:id
router.put("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { name, description, frequency, color, icon, archived, reminderEnabled, reminderTime } = req.body;

    const existing = await prisma.habit.findFirst({
      where: { id, userId: req.userId! },
    });
    if (!existing) {
      res.status(404).json({ error: "Habit not found" });
      return;
    }

    if (name !== undefined && (typeof name !== "string" || name.trim().length === 0)) {
      res.status(400).json({ error: "Name cannot be empty" });
      return;
    }

    if (frequency !== undefined && !isValidFrequency(frequency)) {
      res.status(400).json({ error: "Invalid frequency" });
      return;
    }

    if (color !== undefined && !/^#[0-9a-fA-F]{6}$/.test(color)) {
      res.status(400).json({ error: "Invalid color format" });
      return;
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name.trim();
    if (description !== undefined) data.description = description?.trim() || null;
    if (frequency !== undefined) data.frequency = frequency;
    if (color !== undefined) data.color = color;
    if (icon !== undefined) data.icon = icon;
    if (archived !== undefined) {
      data.archived = archived;
    }
    if (reminderEnabled !== undefined) {
      data.reminderEnabled = reminderEnabled;
    }
    if (reminderTime !== undefined) {
      data.reminderTime = reminderTime;
    }

    const habit = await prisma.habit.update({ where: { id }, data });
    res.json({ habit });
  } catch (err) {
    console.error("Update habit error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/habits/:id/streaks
router.get("/:id/streaks", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const habit = await prisma.habit.findFirst({
      where: { id, userId: req.userId! },
    });
    if (!habit) {
      res.status(404).json({ error: "Habit not found" });
      return;
    }

    const checkIns = await prisma.checkIn.findMany({
      where: { habitId: id, status: "done" },
      orderBy: { date: "desc" },
    });

    const doneSet = new Set(checkIns.map((c) => c.date));

    const { currentStreak, bestStreak, completionRate } = calculateStreaks(
      habit.frequency,
      habit.createdAt,
      doneSet,
    );

    res.json({ currentStreak, bestStreak, completionRate });
  } catch (err) {
    console.error("Streaks error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/habits/:id
router.delete("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const existing = await prisma.habit.findFirst({
      where: { id, userId: req.userId! },
    });
    if (!existing) {
      res.status(404).json({ error: "Habit not found" });
      return;
    }

    await prisma.habit.delete({ where: { id } });
    res.json({ message: "Habit deleted" });
  } catch (err) {
    console.error("Delete habit error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
