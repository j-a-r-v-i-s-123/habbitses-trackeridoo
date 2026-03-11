import { useState, useEffect } from "react";
import { api, Habit } from "@/hooks/useApi";

const ICONS: Record<string, string> = {
  star: "\u2B50", heart: "\u2764\uFE0F", fire: "\uD83D\uDD25",
  book: "\uD83D\uDCD6", run: "\uD83C\uDFC3", water: "\uD83D\uDCA7",
  sleep: "\uD83D\uDE34", meditate: "\uD83E\uDDD8", code: "\uD83D\uDCBB",
  music: "\uD83C\uDFB5", gym: "\uD83C\uDFCB\uFE0F", food: "\uD83C\uDF4E",
  plant: "\uD83C\uDF31", brain: "\uD83E\uDDE0", writing: "\u270D\uFE0F",
};

export default function HabitsView() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getHabits()
      .then((res) => setHabits(res.habits))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {habits.length} habit{habits.length !== 1 ? "s" : ""}
        </span>
      </div>

      {habits.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400 mb-1">No habits yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">Create your first habit to get started!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {habits.map((habit) => (
            <div
              key={habit.id}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                  style={{ backgroundColor: habit.color + "20" }}
                >
                  {ICONS[habit.icon] || ICONS.star}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {habit.name}
                  </p>
                  {habit.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {habit.description}
                    </p>
                  )}
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 capitalize">
                  {habit.frequency}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
