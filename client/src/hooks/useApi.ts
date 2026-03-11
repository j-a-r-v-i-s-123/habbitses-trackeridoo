const BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export interface Habit {
  id: string;
  name: string;
  description: string | null;
  frequency: string;
  color: string;
  icon: string;
  archived: boolean;
  reminderEnabled: boolean;
  reminderTime: string | null;
}

export interface ReminderSetting {
  id: string;
  name: string;
  reminderEnabled: boolean;
  reminderTime: string | null;
}

export interface CheckIn {
  id: string;
  habitId: string;
  date: string;
  status: "done" | "skipped";
  habit?: Pick<Habit, "id" | "name" | "color" | "icon" | "frequency">;
}

export interface Streaks {
  currentStreak: number;
  bestStreak: number;
  completionRate: number;
}

export interface HabitStat {
  id: string;
  name: string;
  color: string;
  icon: string;
  frequency: string;
  currentStreak: number;
  bestStreak: number;
  totalDone: number;
  weeklyData: { week: string; done: number; total: number }[];
}

export interface AnalyticsOverview {
  weekCompletionRate: number;
  monthCompletionRate: number;
  totalCheckIns: number;
  longestStreak: number;
  activeHabits: number;
  dailyActivity: Record<string, number>;
  habitStats: HabitStat[];
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (email: string, password: string, name?: string) =>
    request<{ token: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    }),
  me: () => request<{ user: { id: string; email: string; name: string | null } }>("/auth/me"),
  logout: () => request("/auth/logout", { method: "POST" }),

  // Habits
  getHabits: () => request<{ habits: Habit[] }>("/habits"),

  // Streaks
  getStreaks: (habitId: string) =>
    request<Streaks>(`/habits/${habitId}/streaks`),

  // Check-ins
  getCheckIns: (date: string) =>
    request<{ checkIns: CheckIn[] }>(`/check-ins?date=${date}`),
  createCheckIn: (habitId: string, date: string, status: "done" | "skipped") =>
    request<{ checkIn: CheckIn }>("/check-ins", {
      method: "POST",
      body: JSON.stringify({ habitId, date, status }),
    }),
  deleteCheckIn: (id: string) =>
    request<{ message: string }>(`/check-ins/${id}`, { method: "DELETE" }),

  // Analytics
  getAnalyticsOverview: () =>
    request<AnalyticsOverview>("/analytics/overview"),

  // Reminders
  getReminders: () =>
    request<{ reminders: ReminderSetting[] }>("/reminders"),
  updateReminder: (habitId: string, reminderEnabled: boolean, reminderTime?: string) =>
    request<{ reminder: ReminderSetting }>(`/reminders/${habitId}`, {
      method: "PUT",
      body: JSON.stringify({ reminderEnabled, reminderTime }),
    }),
};
