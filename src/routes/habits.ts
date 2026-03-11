import { Router, Response } from "express";
import prisma from "../db";
import { authenticateToken, AuthRequest } from "../middleware/auth";

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
    const { name, description, frequency, color, icon, archived } = req.body;

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

const DAY_INDEX_MAP: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

function isApplicableDay(dateStr: string, frequency: string): boolean {
  const d = new Date(dateStr + "T12:00:00");
  const dayOfWeek = d.getDay();

  if (frequency === "daily") return true;

  if (frequency === "weekly") {
    // For weekly habits, any day in the week counts - we check per-week
    return true;
  }

  // Custom days like "mon,wed,fri"
  const days = frequency.split(",").map((s) => s.trim().toLowerCase());
  return days.some((day) => DAY_INDEX_MAP[day] === dayOfWeek);
}

function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  // Use ISO week: find the Monday of this week
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return monday.toISOString().slice(0, 10);
}

function calculateStreaks(
  frequency: string,
  createdAt: Date,
  doneSet: Set<string>,
): { currentStreak: number; bestStreak: number; completionRate: number } {
  const today = new Date();
  const startDate = new Date(createdAt);
  startDate.setHours(12, 0, 0, 0);
  today.setHours(12, 0, 0, 0);

  if (today < startDate) {
    return { currentStreak: 0, bestStreak: 0, completionRate: 0 };
  }

  if (frequency === "weekly") {
    return calculateWeeklyStreaks(startDate, today, doneSet);
  }

  // Build list of applicable dates from today back to createdAt
  const applicableDates: string[] = [];
  const cursor = new Date(today);
  while (cursor >= startDate) {
    const ds = cursor.toISOString().slice(0, 10);
    if (isApplicableDay(ds, frequency)) {
      applicableDates.push(ds);
    }
    cursor.setDate(cursor.getDate() - 1);
  }

  if (applicableDates.length === 0) {
    return { currentStreak: 0, bestStreak: 0, completionRate: 0 };
  }

  // applicableDates is sorted newest-first
  let currentStreak = 0;
  let bestStreak = 0;
  let streak = 0;
  let doneCount = 0;

  // Calculate current streak (from most recent applicable day backwards)
  let currentDone = true;
  for (const ds of applicableDates) {
    if (doneSet.has(ds)) {
      doneCount++;
      if (currentDone) currentStreak++;
      streak++;
    } else {
      if (currentDone) currentDone = false;
      if (streak > bestStreak) bestStreak = streak;
      streak = 0;
    }
  }
  if (streak > bestStreak) bestStreak = streak;
  if (currentStreak > bestStreak) bestStreak = currentStreak;

  const completionRate = applicableDates.length > 0
    ? Math.round((doneCount / applicableDates.length) * 100)
    : 0;

  return { currentStreak, bestStreak, completionRate };
}

function calculateWeeklyStreaks(
  startDate: Date,
  today: Date,
  doneSet: Set<string>,
): { currentStreak: number; bestStreak: number; completionRate: number } {
  // Group done dates by week
  const doneWeeks = new Set<string>();
  for (const ds of doneSet) {
    doneWeeks.add(getWeekKey(ds));
  }

  // Build list of weeks from current week back to start week
  const weeks: string[] = [];
  const cursor = new Date(today);
  const startWeek = getWeekKey(startDate.toISOString().slice(0, 10));

  while (true) {
    const wk = getWeekKey(cursor.toISOString().slice(0, 10));
    if (!weeks.includes(wk)) weeks.push(wk);
    if (wk <= startWeek) break;
    cursor.setDate(cursor.getDate() - 7);
  }

  let currentStreak = 0;
  let bestStreak = 0;
  let streak = 0;
  let doneCount = 0;
  let currentDone = true;

  for (const wk of weeks) {
    if (doneWeeks.has(wk)) {
      doneCount++;
      if (currentDone) currentStreak++;
      streak++;
    } else {
      if (currentDone) currentDone = false;
      if (streak > bestStreak) bestStreak = streak;
      streak = 0;
    }
  }
  if (streak > bestStreak) bestStreak = streak;
  if (currentStreak > bestStreak) bestStreak = currentStreak;

  const completionRate = weeks.length > 0
    ? Math.round((doneCount / weeks.length) * 100)
    : 0;

  return { currentStreak, bestStreak, completionRate };
}

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
