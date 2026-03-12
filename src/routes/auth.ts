import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import prisma from "../db";
import { authenticateToken, AuthRequest, JWT_SECRET } from "../middleware/auth";

const router = Router();

const SALT_ROUNDS = 10;
const TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

// Rate limiting for auth endpoints
const isTest = process.env.NODE_ENV === "test";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTest ? 1000 : 10, // effectively unlimited in test
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts, please try again later" },
});

const strictAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTest ? 1000 : 5, // effectively unlimited in test
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts, please try again later" },
});

// POST /api/auth/register
router.post("/register", authLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    if (typeof email !== "string" || !email.includes("@")) {
      res.status(400).json({ error: "Invalid email format" });
      return;
    }

    if (typeof password !== "string" || password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name: name || null },
    });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: TOKEN_MAX_AGE,
    });

    res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name },
      token,
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/login
router.post("/login", strictAuthLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: TOKEN_MAX_AGE,
    });

    res.json({
      user: { id: user.id, email: user.email, name: user.name },
      token,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/logout
router.post("/logout", (_req: Request, res: Response): void => {
  res.clearCookie("token");
  res.json({ message: "Logged out successfully" });
});

// GET /api/auth/me
router.get(
  "/me",
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { id: true, email: true, name: true, createdAt: true },
      });

      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      res.json({ user });
    } catch (err) {
      console.error("Me error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// PUT /api/auth/profile
router.put(
  "/profile",
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { name, email } = req.body;

      const data: Record<string, string> = {};
      if (name !== undefined) data.name = name?.trim() || null as unknown as string;
      if (email !== undefined) {
        if (typeof email !== "string" || !email.includes("@")) {
          res.status(400).json({ error: "Invalid email format" });
          return;
        }
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing && existing.id !== req.userId) {
          res.status(409).json({ error: "Email already in use" });
          return;
        }
        data.email = email;
      }

      const user = await prisma.user.update({
        where: { id: req.userId },
        data,
        select: { id: true, email: true, name: true },
      });

      res.json({ user });
    } catch (err) {
      console.error("Profile update error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// PUT /api/auth/password
router.put(
  "/password",
  strictAuthLimiter,
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        res.status(400).json({ error: "Current and new password are required" });
        return;
      }

      if (typeof newPassword !== "string" || newPassword.length < 8) {
        res.status(400).json({ error: "New password must be at least 8 characters" });
        return;
      }

      const user = await prisma.user.findUnique({ where: { id: req.userId } });
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) {
        res.status(401).json({ error: "Current password is incorrect" });
        return;
      }

      const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
      await prisma.user.update({
        where: { id: req.userId },
        data: { password: hashedPassword },
      });

      res.json({ message: "Password updated successfully" });
    } catch (err) {
      console.error("Password change error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// DELETE /api/auth/account
router.delete(
  "/account",
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { password } = req.body;

      if (!password) {
        res.status(400).json({ error: "Password is required to delete account" });
        return;
      }

      const user = await prisma.user.findUnique({ where: { id: req.userId } });
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        res.status(401).json({ error: "Password is incorrect" });
        return;
      }

      // Delete all user data (cascading deletes handle habits and check-ins)
      await prisma.user.delete({ where: { id: req.userId } });

      res.clearCookie("token");
      res.json({ message: "Account deleted successfully" });
    } catch (err) {
      console.error("Delete account error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
