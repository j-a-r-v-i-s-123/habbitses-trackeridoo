import { Router, Response } from "express";
import prisma from "../db";
import { authenticateToken, AuthRequest } from "../middleware/auth";

const router = Router();

router.use(authenticateToken);

// GET /api/analytics/overview
// Returns all data needed for the dashboard
router.get("/overview", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    const [habits, checkIns] = await Promise.all([
      prisma.habit.findMany({
        where: { userId, archived: false },
        orderBy: { createdAt: "desc" },
      }),
      prisma.checkIn.findMany({
        where: { userId },
        orderBy: { date: "asc" },
      }),
    ]);

    // Build daily activity map (date -> count of "done" check-ins)
    const dailyActivity: Record<string, number> = {};
    const perHabitCheckIns: Record<string, { date: string; status: string }[]> = {};

    let totalDoneCheckIns = 0;

    for (const ci of checkIns) {
      if (ci.status === "done") {
        dailyActivity[ci.date] = (dailyActivity[ci.date] || 0) + 1;
        totalDoneCheckIns++;
      }
      if (!perHabitCheckIns[ci.habitId]) {
        perHabitCheckIns[ci.habitId] = [];
      }
      perHabitCheckIns[ci.habitId].push({ date: ci.date, status: ci.status });
    }

    // Calculate per-habit streaks and completion
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 10);

    // Current week boundaries (Monday-Sunday)
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + mondayOffset);
    const weekStartStr = weekStart.toISOString().slice(0, 10);

    // Current month start
    const monthStartStr = todayStr.slice(0, 7) + "-01";

    let weekDone = 0;
    let weekTotal = 0;
    let monthDone = 0;
    let monthTotal = 0;

    const habitStats = habits.map((habit) => {
      const hCheckIns = perHabitCheckIns[habit.id] || [];
      const doneSet = new Set(
        hCheckIns.filter((c) => c.status === "done").map((c) => c.date)
      );

      // Count applicable days for week/month completion
      const cursor = new Date(weekStart);
      while (cursor <= today) {
        const ds = cursor.toISOString().slice(0, 10);
        if (isApplicableDay(ds, habit.frequency)) {
          weekTotal++;
          if (doneSet.has(ds)) weekDone++;
        }
        cursor.setDate(cursor.getDate() + 1);
      }

      const monthCursor = new Date(monthStartStr + "T12:00:00");
      while (monthCursor <= today) {
        const ds = monthCursor.toISOString().slice(0, 10);
        if (isApplicableDay(ds, habit.frequency)) {
          monthTotal++;
          if (doneSet.has(ds)) monthDone++;
        }
        monthCursor.setDate(monthCursor.getDate() + 1);
      }

      // Calculate streaks
      const { currentStreak, bestStreak } = calculateStreaks(
        habit.frequency,
        habit.createdAt,
        doneSet,
        today
      );

      // Weekly completion data (last 12 weeks)
      const weeklyData = getLast12WeeksData(doneSet, habit.frequency, today);

      return {
        id: habit.id,
        name: habit.name,
        color: habit.color,
        icon: habit.icon,
        frequency: habit.frequency,
        currentStreak,
        bestStreak,
        totalDone: doneSet.size,
        weeklyData,
      };
    });

    // Find longest streak across all habits
    const longestStreak = habitStats.reduce(
      (max, h) => Math.max(max, h.bestStreak),
      0
    );

    res.json({
      weekCompletionRate: weekTotal > 0 ? Math.round((weekDone / weekTotal) * 100) : 0,
      monthCompletionRate: monthTotal > 0 ? Math.round((monthDone / monthTotal) * 100) : 0,
      totalCheckIns: totalDoneCheckIns,
      longestStreak,
      activeHabits: habits.length,
      dailyActivity,
      habitStats,
    });
  } catch (err) {
    console.error("Analytics error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

const DAY_INDEX_MAP: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

function isApplicableDay(dateStr: string, frequency: string): boolean {
  if (frequency === "daily") return true;
  if (frequency === "weekly") return true;
  const d = new Date(dateStr + "T12:00:00");
  const dayOfWeek = d.getDay();
  const days = frequency.split(",").map((s) => s.trim().toLowerCase());
  return days.some((day) => DAY_INDEX_MAP[day] === dayOfWeek);
}

function calculateStreaks(
  frequency: string,
  createdAt: Date,
  doneSet: Set<string>,
  today: Date
): { currentStreak: number; bestStreak: number } {
  const startDate = new Date(createdAt);
  startDate.setHours(12, 0, 0, 0);

  if (today < startDate) return { currentStreak: 0, bestStreak: 0 };

  const applicableDates: string[] = [];
  const cursor = new Date(today);
  while (cursor >= startDate) {
    const ds = cursor.toISOString().slice(0, 10);
    if (isApplicableDay(ds, frequency)) {
      applicableDates.push(ds);
    }
    cursor.setDate(cursor.getDate() - 1);
  }

  if (applicableDates.length === 0) return { currentStreak: 0, bestStreak: 0 };

  let currentStreak = 0;
  let bestStreak = 0;
  let streak = 0;
  let currentDone = true;

  for (const ds of applicableDates) {
    if (doneSet.has(ds)) {
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

  return { currentStreak, bestStreak };
}

function getLast12WeeksData(
  doneSet: Set<string>,
  frequency: string,
  today: Date
): { week: string; done: number; total: number }[] {
  const result: { week: string; done: number; total: number }[] = [];

  for (let w = 11; w >= 0; w--) {
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() - w * 7);
    const dayOfWeek = weekEnd.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(weekEnd);
    monday.setDate(weekEnd.getDate() + mondayOffset);

    let done = 0;
    let total = 0;

    for (let d = 0; d < 7; d++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + d);
      if (day > today) break;
      const ds = day.toISOString().slice(0, 10);
      if (isApplicableDay(ds, frequency)) {
        total++;
        if (doneSet.has(ds)) done++;
      }
    }

    const label = monday.toISOString().slice(5, 10); // "MM-DD"
    result.push({ week: label, done, total });
  }

  return result;
}

export default router;
