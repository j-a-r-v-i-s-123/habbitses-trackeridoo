import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import nodemailer from "nodemailer";
import prisma from "../db";
import { authenticateToken, AuthRequest, JWT_SECRET } from "../middleware/auth";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "localhost",
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: process.env.SMTP_SECURE === "true",
  auth:
    process.env.SMTP_USER && process.env.SMTP_PASS
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
});

const FROM_ADDRESS = process.env.SMTP_FROM || "noreply@habittracker.app";
const APP_URL = process.env.APP_URL || "http://localhost:3000";

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

// POST /api/auth/forgot-password
router.post("/forgot-password", authLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    // Always return success to prevent user enumeration
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.json({ message: "If an account with that email exists, a reset link has been sent" });
      return;
    }

    // Invalidate any existing unused reset tokens for this user
    await prisma.passwordReset.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    // Generate a secure token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordReset.create({
      data: { token, expiresAt, userId: user.id },
    });

    // Send reset email
    const resetUrl = `${APP_URL}/reset-password?token=${token}`;
    try {
      await transporter.sendMail({
        from: FROM_ADDRESS,
        to: user.email,
        subject: "Password Reset - Habit Tracker",
        text: `You requested a password reset. Click the link below to reset your password:\n\n${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this email.`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2>Password Reset</h2>
            <p>You requested a password reset. Click the button below to set a new password:</p>
            <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #5b4fcf; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">Reset Password</a>
            <p style="color: #666; font-size: 14px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("Failed to send reset email:", emailErr);
    }

    res.json({ message: "If an account with that email exists, a reset link has been sent" });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/reset-password
router.post("/reset-password", authLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      res.status(400).json({ error: "Token and new password are required" });
      return;
    }

    if (typeof newPassword !== "string" || newPassword.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    const resetRecord = await prisma.passwordReset.findUnique({ where: { token } });
    if (!resetRecord || resetRecord.used || resetRecord.expiresAt < new Date()) {
      res.status(400).json({ error: "Invalid or expired reset token" });
      return;
    }

    // Mark token as used and update password
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.$transaction([
      prisma.passwordReset.update({ where: { id: resetRecord.id }, data: { used: true } }),
      prisma.user.update({ where: { id: resetRecord.userId }, data: { password: hashedPassword } }),
    ]);

    res.json({ message: "Password has been reset successfully" });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
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
