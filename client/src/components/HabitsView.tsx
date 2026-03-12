import { useState, useEffect } from "react";
import { api, Habit } from "@/hooks/useApi";

const ICONS: Record<string, string> = {
  star: "\u2B50", heart: "\u2764\uFE0F", fire: "\uD83D\uDD25",
  book: "\uD83D\uDCD6", run: "\uD83C\uDFC3", water: "\uD83D\uDCA7",
  sleep: "\uD83D\uDE34", meditate: "\uD83E\uDDD8", code: "\uD83D\uDCBB",
  music: "\uD83C\uDFB5", gym: "\uD83C\uDFCB\uFE0F", food: "\uD83C\uDF4E",
  plant: "\uD83C\uDF31", brain: "\uD83E\uDDE0", writing: "\u270D\uFE0F",
};

const ICON_KEYS = Object.keys(ICONS);

const COLORS = [
  "#5b4fcf", "#e74c3c", "#2ecc71", "#f39c12", "#3498db",
  "#9b59b6", "#1abc9c", "#e67e22", "#e91e63", "#00bcd4",
];

interface HabitFormData {
  name: string;
  description: string;
  frequency: string;
  color: string;
  icon: string;
}

const DAYS = [
  { key: "mon", label: "M" },
  { key: "tue", label: "T" },
  { key: "wed", label: "W" },
  { key: "thu", label: "T" },
  { key: "fri", label: "F" },
  { key: "sat", label: "S" },
  { key: "sun", label: "S" },
];

type FrequencyMode = "daily" | "weekly" | "custom";

function getFrequencyMode(frequency: string): FrequencyMode {
  if (frequency === "daily") return "daily";
  if (frequency === "weekly") return "weekly";
  return "custom";
}

function getSelectedDays(frequency: string): string[] {
  if (frequency === "daily" || frequency === "weekly") return [];
  return frequency.split(",").filter(Boolean);
}

const emptyForm: HabitFormData = {
  name: "",
  description: "",
  frequency: "daily",
  color: "#5b4fcf",
  icon: "star",
};

export default function HabitsView() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<HabitFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    api.getHabits()
      .then((res) => setHabits(res.habits))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
    setShowForm(true);
  }

  function openEdit(habit: Habit) {
    setForm({
      name: habit.name,
      description: habit.description || "",
      frequency: habit.frequency,
      color: habit.color,
      icon: habit.icon,
    });
    setEditingId(habit.id);
    setError("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }

    const mode = getFrequencyMode(form.frequency);
    if (mode === "custom" && getSelectedDays(form.frequency).length === 0) {
      setError("Please select at least one day");
      return;
    }

    setSaving(true);
    setError("");
    try {
      if (editingId) {
        const { habit } = await api.updateHabit(editingId, {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          frequency: form.frequency,
          color: form.color,
          icon: form.icon,
        });
        setHabits((prev) => prev.map((h) => (h.id === editingId ? habit : h)));
      } else {
        const { habit } = await api.createHabit({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          frequency: form.frequency,
          color: form.color,
          icon: form.icon,
        });
        setHabits((prev) => [habit, ...prev]);
      }
      closeForm();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save habit");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.deleteHabit(id);
      setHabits((prev) => prev.filter((h) => h.id !== id));
      setConfirmDelete(null);
    } catch (err) {
      console.error("Failed to delete habit:", err);
    }
  }

  async function toggleArchive(habit: Habit) {
    try {
      const { habit: updated } = await api.updateHabit(habit.id, {
        archived: !habit.archived,
      });
      setHabits((prev) => prev.map((h) => (h.id === habit.id ? updated : h)));
    } catch (err) {
      console.error("Failed to archive habit:", err);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-gray-400 dark:text-gray-500">Loading habits...</span>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          All Habits
        </h2>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New Habit
        </button>
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingId ? "Edit Habit" : "New Habit"}
              </h3>
              <button
                onClick={closeForm}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                  {error}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g. Morning Run"
                  autoFocus
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Optional description"
                />
              </div>

              {/* Frequency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Frequency
                </label>
                <div className="flex gap-2 mb-2">
                  {(["daily", "weekly", "custom"] as FrequencyMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        if (mode === "daily" || mode === "weekly") {
                          setForm((f) => ({ ...f, frequency: mode }));
                        } else {
                          setForm((f) => ({
                            ...f,
                            frequency: getFrequencyMode(f.frequency) === "custom" ? f.frequency : "mon,wed,fri",
                          }));
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        getFrequencyMode(form.frequency) === mode
                          ? "bg-primary-600 text-white"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                    >
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>
                {getFrequencyMode(form.frequency) === "custom" && (
                  <div className="flex gap-1.5">
                    {DAYS.map((day, i) => {
                      const selected = getSelectedDays(form.frequency).includes(day.key);
                      return (
                        <button
                          key={day.key + i}
                          type="button"
                          onClick={() => {
                            const current = getSelectedDays(form.frequency);
                            const next = selected
                              ? current.filter((d) => d !== day.key)
                              : [...current, day.key];
                            const ordered = DAYS.map((d) => d.key).filter((k) => next.includes(k));
                            if (ordered.length > 0) {
                              setForm((f) => ({ ...f, frequency: ordered.join(",") }));
                            }
                          }}
                          className={`w-9 h-9 rounded-full text-sm font-medium transition-all ${
                            selected
                              ? "bg-primary-600 text-white"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Icon */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Icon
                </label>
                <div className="flex flex-wrap gap-2">
                  {ICON_KEYS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, icon: key }))}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all ${
                        form.icon === key
                          ? "ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/30 scale-110"
                          : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                    >
                      {ICONS[key]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, color: c }))}
                      className={`w-8 h-8 rounded-full transition-all ${
                        form.color === c ? "ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-800 scale-110" : ""
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingId ? "Save Changes" : "Create Habit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Habits List */}
      {habits.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400 mb-1">No habits yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">Create your first habit to get started!</p>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Create First Habit
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {habits.map((habit) => (
            <div
              key={habit.id}
              className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border transition-opacity ${
                habit.archived
                  ? "border-gray-200 dark:border-gray-700 opacity-60"
                  : "border-gray-100 dark:border-gray-700"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                  style={{ backgroundColor: habit.color + "20" }}
                >
                  {ICONS[habit.icon] || ICONS.star}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {habit.name}
                    </p>
                    {habit.archived && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                        Archived
                      </span>
                    )}
                  </div>
                  {habit.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {habit.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 capitalize">
                      {habit.frequency}
                    </span>
                    {habit.reminderEnabled && (
                      <span className="text-xs text-primary-600 dark:text-primary-400">
                        Reminder at {habit.reminderTime || "09:00"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEdit(habit)}
                    className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="Edit"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => toggleArchive(habit)}
                    className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title={habit.archived ? "Unarchive" : "Archive"}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                  </button>
                  {confirmDelete === habit.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(habit.id)}
                        className="px-2 py-1 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(habit.id)}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
