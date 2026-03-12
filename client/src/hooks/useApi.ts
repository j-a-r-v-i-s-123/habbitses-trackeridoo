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
  note?: string | null;
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
  forgotPassword: (email: string) =>
    request<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  resetPassword: (token: string, newPassword: string) =>
    request<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    }),

  // Habits
  getHabits: () => request<{ habits: Habit[] }>("/habits"),
  createHabit: (data: { name: string; description?: string; frequency?: string; color?: string; icon?: string }) =>
    request<{ habit: Habit }>("/habits", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateHabit: (id: string, data: Partial<Pick<Habit, "name" | "description" | "frequency" | "color" | "icon" | "archived">>) =>
    request<{ habit: Habit }>(`/habits/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteHabit: (id: string) =>
    request<{ message: string }>(`/habits/${id}`, { method: "DELETE" }),

  // Streaks
  getStreaks: (habitId: string) =>
    request<Streaks>(`/habits/${habitId}/streaks`),

  // Check-ins
  getCheckIns: (date: string) =>
    request<{ checkIns: CheckIn[] }>(`/check-ins?date=${date}`),
  createCheckIn: (habitId: string, date: string, status: "done" | "skipped", note?: string) =>
    request<{ checkIn: CheckIn }>("/check-ins", {
      method: "POST",
      body: JSON.stringify({ habitId, date, status, ...(note !== undefined ? { note } : {}) }),
    }),
  deleteCheckIn: (id: string) =>
    request<{ message: string }>(`/check-ins/${id}`, { method: "DELETE" }),
  getRecentNotes: (limit = 20) =>
    request<{ checkIns: CheckIn[] }>(`/check-ins/notes/recent?limit=${limit}`),

  // Analytics
  getAnalyticsOverview: () =>
    request<AnalyticsOverview>("/analytics/overview"),

  // Account
  updateProfile: (data: { name?: string; email?: string }) =>
    request<{ user: { id: string; email: string; name: string | null } }>("/auth/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string }>("/auth/password", {
      method: "PUT",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  deleteAccount: (password: string) =>
    request<{ message: string }>("/auth/account", {
      method: "DELETE",
      body: JSON.stringify({ password }),
    }),

  // Export
  exportData: async (format: "json" | "csv" = "json") => {
    const res = await fetch(`/api/export?format=${format}`, { credentials: "include" });
    if (!res.ok) throw new Error("Export failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `habittracker-export-${new Date().toISOString().slice(0, 10)}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // Reminders
  getReminders: () =>
    request<{ reminders: ReminderSetting[] }>("/reminders"),
  updateReminder: (habitId: string, reminderEnabled: boolean, reminderTime?: string) =>
    request<{ reminder: ReminderSetting }>(`/reminders/${habitId}`, {
      method: "PUT",
      body: JSON.stringify({ reminderEnabled, reminderTime }),
    }),
};
