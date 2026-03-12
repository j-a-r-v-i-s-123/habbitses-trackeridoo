import { Router, Response } from "express";
import prisma from "../db";
import { authenticateToken, AuthRequest } from "../middleware/auth";

const router = Router();

router.use(authenticateToken);

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const VALID_STATUSES = ["done", "skipped"];

// GET /api/check-ins?date=YYYY-MM-DD
router.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const date = req.query.date as string;

    if (!date || !DATE_REGEX.test(date)) {
      res.status(400).json({ error: "Valid date parameter required (YYYY-MM-DD)" });
      return;
    }

    const checkIns = await prisma.checkIn.findMany({
      where: {
        userId: req.userId!,
        date,
      },
      include: {
        habit: {
          select: { id: true, name: true, color: true, icon: true, frequency: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ checkIns });
  } catch (err) {
    console.error("List check-ins error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/check-ins
router.post("/", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { habitId, date, status, note } = req.body;

    if (!habitId || typeof habitId !== "string") {
      res.status(400).json({ error: "habitId is required" });
      return;
    }

    if (!date || !DATE_REGEX.test(date)) {
      res.status(400).json({ error: "Valid date required (YYYY-MM-DD)" });
      return;
    }

    if (!status || !VALID_STATUSES.includes(status)) {
      res.status(400).json({ error: "Status must be 'done' or 'skipped'" });
      return;
    }

    // Validate optional note
    if (note !== undefined && typeof note !== "string") {
      res.status(400).json({ error: "Note must be a string" });
      return;
    }

    // Verify the habit belongs to the user
    const habit = await prisma.habit.findFirst({
      where: { id: habitId, userId: req.userId! },
    });
    if (!habit) {
      res.status(404).json({ error: "Habit not found" });
      return;
    }

    // Upsert: create or update check-in for this habit+date
    const checkIn = await prisma.checkIn.upsert({
      where: {
        habitId_date: { habitId, date },
      },
      update: { status, note: note ?? undefined },
      create: {
        habitId,
        date,
        status,
        note: note || null,
        userId: req.userId!,
      },
    });

    res.status(201).json({ checkIn });
  } catch (err) {
    console.error("Create check-in error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/check-ins/notes/recent - recent check-ins with notes
router.get("/notes/recent", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 50);

    const checkIns = await prisma.checkIn.findMany({
      where: {
        userId: req.userId!,
        note: { not: null },
      },
      include: {
        habit: {
          select: { id: true, name: true, color: true, icon: true },
        },
      },
      orderBy: { date: "desc" },
      take: limit,
    });

    // Filter out empty strings (SQLite stores "" not null sometimes)
    const withNotes = checkIns.filter((c) => c.note && c.note.trim().length > 0);

    res.json({ checkIns: withNotes });
  } catch (err) {
    console.error("Recent notes error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/check-ins/:id
router.delete("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const existing = await prisma.checkIn.findFirst({
      where: { id, userId: req.userId! },
    });
    if (!existing) {
      res.status(404).json({ error: "Check-in not found" });
      return;
    }

    await prisma.checkIn.delete({ where: { id } });
    res.json({ message: "Check-in removed" });
  } catch (err) {
    console.error("Delete check-in error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
