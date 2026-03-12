import { Router, Response } from "express";
import prisma from "../db";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { calculateStreaks } from "../utils/streaks";

const router = Router();

router.use(authenticateToken);

// GET /api/export?format=json|csv
router.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const format = (req.query.format as string) || "json";

    if (format !== "json" && format !== "csv") {
      res.status(400).json({ error: "Format must be 'json' or 'csv'" });
      return;
    }

    const habits = await prisma.habit.findMany({
      where: { userId: req.userId! },
      include: {
        checkIns: {
          orderBy: { date: "asc" },
          select: { date: true, status: true, createdAt: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Calculate streaks for each habit
    const exportData = habits.map((habit) => {
      const doneSet = new Set(
        habit.checkIns.filter((c) => c.status === "done").map((c) => c.date),
      );
      const streaks = calculateStreaks(habit.frequency, habit.createdAt, doneSet);

      return {
        name: habit.name,
        description: habit.description || "",
        frequency: habit.frequency,
        color: habit.color,
        icon: habit.icon,
        archived: habit.archived,
        createdAt: habit.createdAt.toISOString(),
        currentStreak: streaks.currentStreak,
        bestStreak: streaks.bestStreak,
        completionRate: streaks.completionRate,
        totalCheckIns: habit.checkIns.length,
        totalDone: habit.checkIns.filter((c) => c.status === "done").length,
        totalSkipped: habit.checkIns.filter((c) => c.status === "skipped").length,
        checkIns: habit.checkIns.map((c) => ({
          date: c.date,
          status: c.status,
        })),
      };
    });

    if (format === "json") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="habittracker-export-${new Date().toISOString().slice(0, 10)}.json"`,
      );
      res.json({ exportedAt: new Date().toISOString(), habits: exportData });
      return;
    }

    // CSV format: flatten check-ins into rows
    const rows: string[][] = [];
    rows.push([
      "Habit",
      "Description",
      "Frequency",
      "Archived",
      "Created",
      "Current Streak",
      "Best Streak",
      "Completion Rate",
      "Check-in Date",
      "Check-in Status",
    ]);

    for (const habit of exportData) {
      if (habit.checkIns.length === 0) {
        rows.push([
          habit.name,
          habit.description,
          habit.frequency,
          String(habit.archived),
          habit.createdAt,
          String(habit.currentStreak),
          String(habit.bestStreak),
          String(habit.completionRate),
          "",
          "",
        ]);
      } else {
        for (const ci of habit.checkIns) {
          rows.push([
            habit.name,
            habit.description,
            habit.frequency,
            String(habit.archived),
            habit.createdAt,
            String(habit.currentStreak),
            String(habit.bestStreak),
            String(habit.completionRate),
            ci.date,
            ci.status,
          ]);
        }
      }
    }

    const csvContent = rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="habittracker-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    res.send(csvContent);
  } catch (err) {
    console.error("Export error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
