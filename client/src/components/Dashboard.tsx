import { useState, useEffect } from "react";
import { api, AnalyticsOverview } from "@/hooks/useApi";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const ICONS: Record<string, string> = {
  star: "\u2B50", heart: "\u2764\uFE0F", fire: "\uD83D\uDD25",
  book: "\uD83D\uDCD6", run: "\uD83C\uDFC3", water: "\uD83D\uDCA7",
  sleep: "\uD83D\uDE34", meditate: "\uD83E\uDDD8", code: "\uD83D\uDCBB",
  music: "\uD83C\uDFB5", gym: "\uD83C\uDFCB\uFE0F", food: "\uD83C\uDF4E",
  plant: "\uD83C\uDF31", brain: "\uD83E\uDDE0", writing: "\u270D\uFE0F",
};

interface DashboardProps {
  onBack: () => void;
}

export default function Dashboard({ onBack }: DashboardProps) {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getAnalyticsOverview()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">Loading dashboard...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-500">{error || "Failed to load"}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <button
            onClick={onBack}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Back to Today
          </button>
        </div>

        {/* Motivational Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Week Rate" value={`${data.weekCompletionRate}%`} sub="completion" color="indigo" />
          <StatCard label="Month Rate" value={`${data.monthCompletionRate}%`} sub="completion" color="blue" />
          <StatCard label="Total Check-ins" value={String(data.totalCheckIns)} sub="all time" color="green" />
          <StatCard label="Longest Streak" value={`${data.longestStreak}d`} sub="best ever" color="orange" />
        </div>

        {/* Calendar Heatmap */}
        <section className="bg-white rounded-xl shadow-sm p-5 mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Activity Heatmap</h2>
          <CalendarHeatmap dailyActivity={data.dailyActivity} />
        </section>

        {/* Per-Habit Charts */}
        {data.habitStats.length > 0 && (
          <section className="bg-white rounded-xl shadow-sm p-5 mb-8">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              Habit Progress (Last 12 Weeks)
            </h2>
            <div className="space-y-8">
              {data.habitStats.map((habit) => (
                <div key={habit.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{ICONS[habit.icon] || ICONS.star}</span>
                    <span className="font-medium text-gray-700">{habit.name}</span>
                    <span className="text-xs text-gray-400 ml-auto">
                      streak: {habit.currentStreak}d | best: {habit.bestStreak}d | total: {habit.totalDone}
                    </span>
                  </div>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={habit.weeklyData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip
                          formatter={(value, name) => [
                            value,
                            name === "done" ? "Completed" : name,
                          ]}
                          labelFormatter={(label) => `Week of ${label}`}
                        />
                        <Bar dataKey="done" fill={habit.color} radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Habits Maintained */}
        <section className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">
            Habits Maintained ({data.activeHabits})
          </h2>
          {data.habitStats.length === 0 ? (
            <p className="text-gray-400 text-sm">No habits yet. Create one to get started!</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.habitStats.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-100"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                    style={{ backgroundColor: h.color + "22" }}
                  >
                    {ICONS[h.icon] || ICONS.star}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-700 truncate">{h.name}</div>
                    <div className="text-xs text-gray-400">
                      {h.currentStreak}d streak | {h.totalDone} check-ins
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-700",
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    orange: "bg-orange-50 text-orange-700",
  };
  const cls = colorMap[color] || colorMap.indigo;

  return (
    <div className={`rounded-xl p-4 ${cls}`}>
      <div className="text-xs font-medium opacity-70 mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs opacity-60">{sub}</div>
    </div>
  );
}

function CalendarHeatmap({ dailyActivity }: { dailyActivity: Record<string, number> }) {
  // Build 52 weeks of data ending today
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const weeks: { date: Date; count: number; dateStr: string }[][] = [];
  const totalDays = 52 * 7;
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - totalDays + 1);

  // Align to Sunday
  const startDow = startDate.getDay();
  startDate.setDate(startDate.getDate() - startDow);

  let currentWeek: { date: Date; count: number; dateStr: string }[] = [];

  const cursor = new Date(startDate);
  while (cursor <= today) {
    const ds = cursor.toISOString().slice(0, 10);
    currentWeek.push({
      date: new Date(cursor),
      count: dailyActivity[ds] || 0,
      dateStr: ds,
    });
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  // Find max for scaling
  const maxCount = Math.max(1, ...Object.values(dailyActivity));

  function getColor(count: number): string {
    if (count === 0) return "#ebedf0";
    const ratio = count / maxCount;
    if (ratio <= 0.25) return "#9be9a8";
    if (ratio <= 0.5) return "#40c463";
    if (ratio <= 0.75) return "#30a14e";
    return "#216e39";
  }

  const monthLabels: { label: string; col: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, i) => {
    const d = week[0]?.date;
    if (d) {
      const m = d.getMonth();
      if (m !== lastMonth) {
        monthLabels.push({
          label: d.toLocaleDateString("en-US", { month: "short" }),
          col: i,
        });
        lastMonth = m;
      }
    }
  });

  const cellSize = 11;
  const gap = 2;

  return (
    <div className="overflow-x-auto">
      <div className="inline-block">
        {/* Month labels */}
        <div className="flex ml-8 mb-1" style={{ gap: 0 }}>
          {monthLabels.map((m, i) => (
            <div
              key={i}
              className="text-xs text-gray-400"
              style={{
                position: "relative",
                left: m.col * (cellSize + gap),
                width: 0,
                whiteSpace: "nowrap",
              }}
            >
              {m.label}
            </div>
          ))}
        </div>
        <div className="flex gap-0">
          {/* Day labels */}
          <div className="flex flex-col mr-1" style={{ gap }}>
            {["", "Mon", "", "Wed", "", "Fri", ""].map((d, i) => (
              <div
                key={i}
                className="text-xs text-gray-400 flex items-center justify-end"
                style={{ height: cellSize, width: 28 }}
              >
                {d}
              </div>
            ))}
          </div>
          {/* Cells */}
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col" style={{ gap }}>
              {Array.from({ length: 7 }).map((_, di) => {
                const day = week[di];
                if (!day) {
                  return (
                    <div
                      key={di}
                      style={{ width: cellSize, height: cellSize }}
                    />
                  );
                }
                return (
                  <div
                    key={di}
                    title={`${day.dateStr}: ${day.count} check-in${day.count !== 1 ? "s" : ""}`}
                    className="rounded-sm"
                    style={{
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: getColor(day.count),
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
        {/* Legend */}
        <div className="flex items-center gap-1 mt-2 ml-8">
          <span className="text-xs text-gray-400 mr-1">Less</span>
          {[0, 0.25, 0.5, 0.75, 1].map((r) => (
            <div
              key={r}
              className="rounded-sm"
              style={{
                width: cellSize,
                height: cellSize,
                backgroundColor: getColor(Math.ceil(r * maxCount)),
              }}
            />
          ))}
          <span className="text-xs text-gray-400 ml-1">More</span>
        </div>
      </div>
    </div>
  );
}
