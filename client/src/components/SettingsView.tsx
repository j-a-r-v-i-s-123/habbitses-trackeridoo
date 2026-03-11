import { useState, useEffect } from "react";
import { useTheme } from "./Layout";
import { api, ReminderSetting } from "@/hooks/useApi";

export default function SettingsView() {
  const { darkMode, toggleDarkMode } = useTheme();
  const [reminders, setReminders] = useState<ReminderSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    api
      .getReminders()
      .then((res) => setReminders(res.reminders))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function toggleReminder(habit: ReminderSetting) {
    setSaving(habit.id);
    try {
      const newEnabled = !habit.reminderEnabled;
      const res = await api.updateReminder(
        habit.id,
        newEnabled,
        habit.reminderTime || "09:00",
      );
      setReminders((prev) =>
        prev.map((r) => (r.id === habit.id ? res.reminder : r)),
      );
    } catch (err) {
      console.error("Failed to toggle reminder:", err);
    } finally {
      setSaving(null);
    }
  }

  async function updateTime(habitId: string, time: string) {
    setSaving(habitId);
    try {
      const res = await api.updateReminder(habitId, true, time);
      setReminders((prev) =>
        prev.map((r) => (r.id === habitId ? res.reminder : r)),
      );
    } catch (err) {
      console.error("Failed to update reminder time:", err);
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Settings
      </h2>

      <div className="space-y-4">
        {/* Appearance */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
              Appearance
            </h3>
          </div>
          <div className="px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Dark Mode</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Switch between light and dark themes
                </p>
              </div>
              <button
                onClick={toggleDarkMode}
                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  ${darkMode ? "bg-primary-600" : "bg-gray-300 dark:bg-gray-600"}
                `}
                role="switch"
                aria-checked={darkMode}
              >
                <span
                  className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    ${darkMode ? "translate-x-6" : "translate-x-1"}
                  `}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Reminders */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
              Reminders
            </h3>
          </div>
          <div className="px-5 py-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Enable email reminders per habit. You'll receive a notification at the chosen time.
            </p>

            {loading ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Loading habits...
              </p>
            ) : reminders.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">
                No habits found. Create a habit first to set up reminders.
              </p>
            ) : (
              <div className="space-y-3">
                {reminders.map((habit) => (
                  <div
                    key={habit.id}
                    className="flex items-center justify-between gap-3 py-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {habit.name}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {habit.reminderEnabled && (
                        <input
                          type="time"
                          value={habit.reminderTime || "09:00"}
                          onChange={(e) => updateTime(habit.id, e.target.value)}
                          disabled={saving === habit.id}
                          className="text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 text-gray-900 dark:text-white"
                        />
                      )}

                      <button
                        onClick={() => toggleReminder(habit)}
                        disabled={saving === habit.id}
                        className={`
                          relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                          ${habit.reminderEnabled ? "bg-primary-600" : "bg-gray-300 dark:bg-gray-600"}
                          ${saving === habit.id ? "opacity-50" : ""}
                        `}
                        role="switch"
                        aria-checked={habit.reminderEnabled}
                      >
                        <span
                          className={`
                            inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                            ${habit.reminderEnabled ? "translate-x-6" : "translate-x-1"}
                          `}
                        />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Account */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
              Account
            </h3>
          </div>
          <div className="px-5 py-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Account management features coming soon.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
