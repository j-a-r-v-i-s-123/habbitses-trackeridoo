const DAY_INDEX_MAP: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

export function isApplicableDay(dateStr: string, frequency: string): boolean {
  if (frequency === "daily") return true;
  if (frequency === "weekly") return true;

  const d = new Date(dateStr + "T12:00:00");
  const dayOfWeek = d.getDay();
  const days = frequency.split(",").map((s) => s.trim().toLowerCase());
  return days.some((day) => DAY_INDEX_MAP[day] === dayOfWeek);
}

export function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return monday.toISOString().slice(0, 10);
}

export function calculateStreaks(
  frequency: string,
  createdAt: Date,
  doneSet: Set<string>,
  today?: Date,
): { currentStreak: number; bestStreak: number; completionRate: number } {
  const todayDate = today || new Date();
  const startDate = new Date(createdAt);
  startDate.setHours(12, 0, 0, 0);
  todayDate.setHours(12, 0, 0, 0);

  if (todayDate < startDate) {
    return { currentStreak: 0, bestStreak: 0, completionRate: 0 };
  }

  if (frequency === "weekly") {
    return calculateWeeklyStreaks(startDate, todayDate, doneSet);
  }

  const applicableDates: string[] = [];
  const cursor = new Date(todayDate);
  while (cursor >= startDate) {
    const ds = cursor.toISOString().slice(0, 10);
    if (isApplicableDay(ds, frequency)) {
      applicableDates.push(ds);
    }
    cursor.setDate(cursor.getDate() - 1);
  }

  if (applicableDates.length === 0) {
    return { currentStreak: 0, bestStreak: 0, completionRate: 0 };
  }

  let currentStreak = 0;
  let bestStreak = 0;
  let streak = 0;
  let doneCount = 0;
  let currentDone = true;

  for (const ds of applicableDates) {
    if (doneSet.has(ds)) {
      doneCount++;
      if (currentDone) currentStreak++;
      streak++;
    } else {
      if (currentDone) currentDone = false;
      if (streak > bestStreak) bestStreak = streak;
      streak = 0;
    }
  }
  if (streak > bestStreak) bestStreak = streak;
  if (currentStreak > bestStreak) bestStreak = currentStreak;

  const completionRate = applicableDates.length > 0
    ? Math.round((doneCount / applicableDates.length) * 100)
    : 0;

  return { currentStreak, bestStreak, completionRate };
}

export function calculateWeeklyStreaks(
  startDate: Date,
  today: Date,
  doneSet: Set<string>,
): { currentStreak: number; bestStreak: number; completionRate: number } {
  const doneWeeks = new Set<string>();
  for (const ds of doneSet) {
    doneWeeks.add(getWeekKey(ds));
  }

  const weeks: string[] = [];
  const cursor = new Date(today);
  const startWeek = getWeekKey(startDate.toISOString().slice(0, 10));

  while (true) {
    const wk = getWeekKey(cursor.toISOString().slice(0, 10));
    if (!weeks.includes(wk)) weeks.push(wk);
    if (wk <= startWeek) break;
    cursor.setDate(cursor.getDate() - 7);
  }

  let currentStreak = 0;
  let bestStreak = 0;
  let streak = 0;
  let doneCount = 0;
  let currentDone = true;

  for (const wk of weeks) {
    if (doneWeeks.has(wk)) {
      doneCount++;
      if (currentDone) currentStreak++;
      streak++;
    } else {
      if (currentDone) currentDone = false;
      if (streak > bestStreak) bestStreak = streak;
      streak = 0;
    }
  }
  if (streak > bestStreak) bestStreak = streak;
  if (currentStreak > bestStreak) bestStreak = currentStreak;

  const completionRate = weeks.length > 0
    ? Math.round((doneCount / weeks.length) * 100)
    : 0;

  return { currentStreak, bestStreak, completionRate };
}
