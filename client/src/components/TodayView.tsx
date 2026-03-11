import { useState, useEffect, useCallback } from "react";
import { api, Habit, CheckIn, Streaks } from "@/hooks/useApi";

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDisplayDate(dateStr: string): string {
  const today = formatDate(new Date());
  const yesterday = formatDate(new Date(Date.now() - 86400000));
  if (dateStr === today) return "Today";
  if (dateStr === yesterday) return "Yesterday";
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

const ICONS: Record<string, string> = {
  star: "\u2B50",
  heart: "\u2764\uFE0F",
  fire: "\uD83D\uDD25",
  book: "\uD83D\uDCD6",
  run: "\uD83C\uDFC3",
  water: "\uD83D\uDCA7",
  sleep: "\uD83D\uDE34",
  meditate: "\uD83E\uDDD8",
  code: "\uD83D\uDCBB",
  music: "\uD83C\uDFB5",
};

interface TodayViewProps {
  onLogout: () => void;
  onDashboard?: () => void;
}

export default function TodayView({ onLogout, onDashboard }: TodayViewProps) {
  const [date, setDate] = useState(() => formatDate(new Date()));
  const [habits, setHabits] = useState<Habit[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [animating, setAnimating] = useState<string | null>(null);
  const [streaks, setStreaks] = useState<Record<string, Streaks>>({});

  const loadData = useCallback(async () => {
    try {
      const [habitsRes, checkInsRes] = await Promise.all([
        api.getHabits(),
        api.getCheckIns(date),
      ]);
      setHabits(habitsRes.habits);
      setCheckIns(checkInsRes.checkIns);

      // Load streaks for all habits
      const streakResults = await Promise.all(
        habitsRes.habits.map(async (h) => {
          try {
            const s = await api.getStreaks(h.id);
            return [h.id, s] as const;
          } catch {
            return [h.id, { currentStreak: 0, bestStreak: 0, completionRate: 0 }] as const;
          }
        })
      );
      setStreaks(Object.fromEntries(streakResults));
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  function getCheckIn(habitId: string): CheckIn | undefined {
    return checkIns.find((c) => c.habitId === habitId);
  }

  async function toggleStatus(habit: Habit, targetStatus: "done" | "skipped") {
    const existing = getCheckIn(habit.id);

    // If already this status, remove the check-in
    if (existing && existing.status === targetStatus) {
      try {
        await api.deleteCheckIn(existing.id);
        setCheckIns((prev) => prev.filter((c) => c.id !== existing.id));
      } catch (err) {
        console.error("Failed to remove check-in:", err);
      }
      return;
    }

    // Otherwise create/update
    try {
      if (targetStatus === "done") {
        setAnimating(habit.id);
        setTimeout(() => setAnimating(null), 600);
      }
      const { checkIn } = await api.createCheckIn(habit.id, date, targetStatus);
      setCheckIns((prev) => {
        const without = prev.filter((c) => c.habitId !== habit.id);
        return [...without, checkIn];
      });
    } catch (err) {
      console.error("Failed to create check-in:", err);
    }
  }

  function navigateDate(offset: number) {
    setDate((prev) => {
      const d = new Date(prev + "T12:00:00");
      d.setDate(d.getDate() + offset);
      return formatDate(d);
    });
  }

  const isToday = date === formatDate(new Date());
  const completedCount = checkIns.filter((c) => c.status === "done").length;
  const totalActive = habits.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">Habit Tracker</h1>
          <div className="flex items-center gap-3">
            {onDashboard && (
              <button
                onClick={onDashboard}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Dashboard
              </button>
            )}
            <button
              onClick={onLogout}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Date Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigateDate(-1)}
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors text-gray-600"
            aria-label="Previous day"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900">
              {formatDisplayDate(date)}
            </h2>
            <p className="text-sm text-gray-500">{date}</p>
          </div>
          <button
            onClick={() => navigateDate(1)}
            disabled={isToday}
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Next day"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Progress */}
        {totalActive > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">
                {completedCount} of {totalActive} done
              </span>
              <span className="text-sm font-medium text-gray-600">
                {totalActive > 0 ? Math.round((completedCount / totalActive) * 100) : 0}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${totalActive > 0 ? (completedCount / totalActive) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Habits List */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : habits.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg mb-2">No habits yet</p>
            <p className="text-gray-400 text-sm">Create some habits to start tracking!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {habits.map((habit) => {
              const checkIn = getCheckIn(habit.id);
              const isDone = checkIn?.status === "done";
              const isSkipped = checkIn?.status === "skipped";
              const isAnimatingThis = animating === habit.id;
              const habitStreaks = streaks[habit.id];

              return (
                <div
                  key={habit.id}
                  className={`
                    bg-white rounded-xl p-4 shadow-sm border-2 transition-all duration-300
                    ${isDone ? "border-green-400 bg-green-50" : isSkipped ? "border-gray-300 bg-gray-50" : "border-transparent"}
                    ${isAnimatingThis ? "scale-[1.02]" : ""}
                  `}
                >
                  <div className="flex items-center gap-3">
                    {/* Icon */}
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                      style={{ backgroundColor: habit.color + "20" }}
                    >
                      {ICONS[habit.icon] || ICONS.star}
                    </div>

                    {/* Name & Streaks */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${isDone ? "text-green-700 line-through" : isSkipped ? "text-gray-400" : "text-gray-900"}`}>
                        {habit.name}
                      </p>
                      {habit.description && (
                        <p className="text-xs text-gray-400 truncate">{habit.description}</p>
                      )}
                      {habitStreaks && (
                        <div className="flex gap-3 mt-1">
                          {habitStreaks.currentStreak > 0 && (
                            <span className="text-xs font-medium text-orange-500">
                              {habitStreaks.currentStreak}d streak
                            </span>
                          )}
                          {habitStreaks.bestStreak > 1 && (
                            <span className="text-xs text-gray-400">
                              Best: {habitStreaks.bestStreak}d
                            </span>
                          )}
                          <span className="text-xs text-gray-400">
                            {habitStreaks.completionRate}%
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 flex-shrink-0">
                      {/* Done Button */}
                      <button
                        onClick={() => toggleStatus(habit, "done")}
                        className={`
                          w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                          ${isDone
                            ? "bg-green-500 text-white shadow-md shadow-green-200"
                            : "bg-gray-100 text-gray-400 hover:bg-green-100 hover:text-green-600"
                          }
                          ${isAnimatingThis ? "animate-bounce" : ""}
                        `}
                        aria-label={`Mark ${habit.name} as done`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>

                      {/* Skip Button */}
                      <button
                        onClick={() => toggleStatus(habit, "skipped")}
                        className={`
                          w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                          ${isSkipped
                            ? "bg-gray-400 text-white shadow-md shadow-gray-200"
                            : "bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                          }
                        `}
                        aria-label={`Skip ${habit.name}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Jump to Today */}
        {!isToday && (
          <button
            onClick={() => setDate(formatDate(new Date()))}
            className="mt-6 w-full py-2 text-indigo-600 font-medium text-sm hover:underline"
          >
            Jump to Today
          </button>
        )}
      </div>
    </div>
  );
}
