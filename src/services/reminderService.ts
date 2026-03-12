import cron from "node-cron";
import nodemailer from "nodemailer";
import prisma from "../db";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "localhost",
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: process.env.SMTP_SECURE === "true",
  auth:
    process.env.SMTP_USER && process.env.SMTP_PASS
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        }
      : undefined,
});

const FROM_ADDRESS = process.env.SMTP_FROM || "reminders@habittracker.app";

// Per-user email rate limiting: max emails per user per hour
const MAX_EMAILS_PER_USER_PER_HOUR = 5;
const emailSendLog = new Map<string, number[]>();

function isRateLimited(userEmail: string): boolean {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const timestamps = (emailSendLog.get(userEmail) || []).filter(
    (t) => t > oneHourAgo,
  );
  emailSendLog.set(userEmail, timestamps);
  return timestamps.length >= MAX_EMAILS_PER_USER_PER_HOUR;
}

function recordEmailSent(userEmail: string): void {
  const timestamps = emailSendLog.get(userEmail) || [];
  timestamps.push(Date.now());
  emailSendLog.set(userEmail, timestamps);
}

async function sendReminderEmail(
  to: string,
  habitName: string,
): Promise<void> {
  try {
    await transporter.sendMail({
      from: FROM_ADDRESS,
      to,
      subject: `Reminder: ${habitName}`,
      text: `Hey! Just a friendly reminder to complete your habit: "${habitName}". Keep up the great work!`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #5b4fcf;">Habit Reminder</h2>
          <p>Hey! Just a friendly reminder to complete your habit:</p>
          <p style="font-size: 18px; font-weight: bold; color: #1f2937;">${habitName}</p>
          <p>Keep up the great work!</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="font-size: 12px; color: #9ca3af;">
            You're receiving this because you enabled reminders for this habit.
            Update your reminder settings in the app to stop these emails.
          </p>
        </div>
      `,
    });
    console.log(`Reminder sent to ${to} for habit "${habitName}"`);
  } catch (err) {
    console.error(`Failed to send reminder to ${to}:`, err);
  }
}

async function checkAndSendReminders(): Promise<void> {
  const now = new Date();
  const currentHH = String(now.getHours()).padStart(2, "0");
  const currentMM = String(now.getMinutes()).padStart(2, "0");
  const currentTime = `${currentHH}:${currentMM}`;

  try {
    const habits = await prisma.habit.findMany({
      where: {
        reminderEnabled: true,
        reminderTime: currentTime,
        archived: false,
      },
      include: {
        user: { select: { email: true } },
      },
    });

    for (const habit of habits) {
      if (isRateLimited(habit.user.email)) {
        console.warn(
          `Rate limit reached for ${habit.user.email}, skipping reminder for "${habit.name}"`,
        );
        continue;
      }
      await sendReminderEmail(habit.user.email, habit.name);
      recordEmailSent(habit.user.email);
    }

    if (habits.length > 0) {
      console.log(
        `Processed ${habits.length} reminder(s) for time ${currentTime}`,
      );
    }
  } catch (err) {
    console.error("Error checking reminders:", err);
  }
}

export function startReminderScheduler(): void {
  // Run every minute to check for habits that need reminders at the current time
  cron.schedule("* * * * *", () => {
    checkAndSendReminders();
  });

  console.log("Reminder scheduler started (checking every minute)");
}
