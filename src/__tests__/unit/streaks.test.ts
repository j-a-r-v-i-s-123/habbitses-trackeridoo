import {
  calculateStreaks,
  calculateWeeklyStreaks,
  isApplicableDay,
  getWeekKey,
} from "../../utils/streaks";

describe("isApplicableDay", () => {
  test("daily frequency applies to every day", () => {
    expect(isApplicableDay("2025-03-10", "daily")).toBe(true); // Monday
    expect(isApplicableDay("2025-03-15", "daily")).toBe(true); // Saturday
    expect(isApplicableDay("2025-03-16", "daily")).toBe(true); // Sunday
  });

  test("weekly frequency applies to every day", () => {
    expect(isApplicableDay("2025-03-10", "weekly")).toBe(true);
    expect(isApplicableDay("2025-03-16", "weekly")).toBe(true);
  });

  test("custom days frequency matches correct days", () => {
    // 2025-03-10 is Monday, 2025-03-12 is Wednesday, 2025-03-14 is Friday
    expect(isApplicableDay("2025-03-10", "mon,wed,fri")).toBe(true);
    expect(isApplicableDay("2025-03-12", "mon,wed,fri")).toBe(true);
    expect(isApplicableDay("2025-03-14", "mon,wed,fri")).toBe(true);
    expect(isApplicableDay("2025-03-11", "mon,wed,fri")).toBe(false); // Tuesday
    expect(isApplicableDay("2025-03-13", "mon,wed,fri")).toBe(false); // Thursday
  });

  test("custom days are case-insensitive", () => {
    expect(isApplicableDay("2025-03-10", "Mon,Wed,Fri")).toBe(true);
  });
});

describe("getWeekKey", () => {
  test("returns Monday of the given week", () => {
    // 2025-03-12 is Wednesday, Monday is 2025-03-10
    expect(getWeekKey("2025-03-12")).toBe("2025-03-10");
  });

  test("Monday returns itself", () => {
    expect(getWeekKey("2025-03-10")).toBe("2025-03-10");
  });

  test("Sunday returns previous Monday", () => {
    // 2025-03-16 is Sunday, Monday was 2025-03-10
    expect(getWeekKey("2025-03-16")).toBe("2025-03-10");
  });
});

describe("calculateStreaks", () => {
  const makeDate = (dateStr: string) => new Date(dateStr + "T12:00:00");

  describe("daily frequency", () => {
    test("returns zeros when no check-ins exist", () => {
      const result = calculateStreaks(
        "daily",
        makeDate("2025-03-01"),
        new Set(),
        makeDate("2025-03-10"),
      );
      expect(result.currentStreak).toBe(0);
      expect(result.bestStreak).toBe(0);
      expect(result.completionRate).toBe(0);
    });

    test("calculates current streak correctly", () => {
      const doneSet = new Set(["2025-03-10", "2025-03-09", "2025-03-08"]);
      const result = calculateStreaks(
        "daily",
        makeDate("2025-03-01"),
        doneSet,
        makeDate("2025-03-10"),
      );
      expect(result.currentStreak).toBe(3);
    });

    test("current streak breaks on missed day", () => {
      const doneSet = new Set(["2025-03-10", "2025-03-08", "2025-03-07"]);
      const result = calculateStreaks(
        "daily",
        makeDate("2025-03-01"),
        doneSet,
        makeDate("2025-03-10"),
      );
      expect(result.currentStreak).toBe(1); // Only today
      expect(result.bestStreak).toBe(2); // 07 and 08
    });

    test("calculates best streak across history", () => {
      const doneSet = new Set([
        "2025-03-10",
        "2025-03-05", "2025-03-04", "2025-03-03", "2025-03-02", "2025-03-01",
      ]);
      const result = calculateStreaks(
        "daily",
        makeDate("2025-03-01"),
        doneSet,
        makeDate("2025-03-10"),
      );
      expect(result.currentStreak).toBe(1);
      expect(result.bestStreak).toBe(5);
    });

    test("calculates completion rate", () => {
      // 10 days from Mar 1 to Mar 10, 5 done = 50%
      const doneSet = new Set([
        "2025-03-01", "2025-03-03", "2025-03-05", "2025-03-07", "2025-03-09",
      ]);
      const result = calculateStreaks(
        "daily",
        makeDate("2025-03-01"),
        doneSet,
        makeDate("2025-03-10"),
      );
      expect(result.completionRate).toBe(50);
    });

    test("100% completion rate when all days done", () => {
      const doneSet = new Set([
        "2025-03-01", "2025-03-02", "2025-03-03",
      ]);
      const result = calculateStreaks(
        "daily",
        makeDate("2025-03-01"),
        doneSet,
        makeDate("2025-03-03"),
      );
      expect(result.completionRate).toBe(100);
      expect(result.currentStreak).toBe(3);
      expect(result.bestStreak).toBe(3);
    });

    test("returns zeros when today is before createdAt", () => {
      const result = calculateStreaks(
        "daily",
        makeDate("2025-03-15"),
        new Set(["2025-03-10"]),
        makeDate("2025-03-10"),
      );
      expect(result).toEqual({ currentStreak: 0, bestStreak: 0, completionRate: 0 });
    });
  });

  describe("custom days frequency", () => {
    test("only counts applicable days for streak", () => {
      // mon,wed,fri - 2025-03-03 is Mon, 05 is Wed, 07 is Fri, 10 is Mon
      const doneSet = new Set(["2025-03-10", "2025-03-07", "2025-03-05"]);
      const result = calculateStreaks(
        "mon,wed,fri",
        makeDate("2025-03-01"),
        doneSet,
        makeDate("2025-03-10"),
      );
      expect(result.currentStreak).toBe(3);
    });

    test("skips non-applicable days without breaking streak", () => {
      // Mon and Fri done, Tue-Thu are not applicable for "mon,fri"
      const doneSet = new Set(["2025-03-10", "2025-03-07"]); // Mon and Fri
      const result = calculateStreaks(
        "mon,fri",
        makeDate("2025-03-01"),
        doneSet,
        makeDate("2025-03-10"),
      );
      expect(result.currentStreak).toBe(2);
    });
  });
});

describe("calculateWeeklyStreaks", () => {
  const makeDate = (dateStr: string) => new Date(dateStr + "T12:00:00");

  test("counts weeks with at least one done check-in", () => {
    // Week of 2025-03-03 (Mon) and 2025-03-10 (Mon)
    const doneSet = new Set(["2025-03-05", "2025-03-11"]);
    const result = calculateWeeklyStreaks(
      makeDate("2025-03-01"),
      makeDate("2025-03-12"),
      doneSet,
    );
    expect(result.currentStreak).toBe(2);
  });

  test("breaks streak on week with no check-ins", () => {
    // Done in week of Mar 10, skip week of Mar 3, done in week of Feb 24
    const doneSet = new Set(["2025-03-11", "2025-02-25"]);
    const result = calculateWeeklyStreaks(
      makeDate("2025-02-24"),
      makeDate("2025-03-12"),
      doneSet,
    );
    expect(result.currentStreak).toBe(1);
    expect(result.bestStreak).toBe(1);
  });

  test("returns zeros when no done dates", () => {
    const result = calculateWeeklyStreaks(
      makeDate("2025-03-01"),
      makeDate("2025-03-12"),
      new Set(),
    );
    expect(result.currentStreak).toBe(0);
    expect(result.completionRate).toBe(0);
  });
});
