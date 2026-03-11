import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, test, expect, vi, beforeEach } from "vitest";
import TodayView from "../TodayView";

const mockHabits = [
  {
    id: "h1",
    name: "Exercise",
    description: "Daily workout",
    frequency: "daily",
    color: "#ff5733",
    icon: "run",
    archived: false,
    reminderEnabled: false,
    reminderTime: null,
  },
  {
    id: "h2",
    name: "Read",
    description: null,
    frequency: "daily",
    color: "#5b4fcf",
    icon: "book",
    archived: false,
    reminderEnabled: false,
    reminderTime: null,
  },
];

const mockCheckIns = [
  { id: "c1", habitId: "h1", date: "2025-03-10", status: "done" as const },
];

const mockStreaks = { currentStreak: 3, bestStreak: 5, completionRate: 75 };

vi.mock("@/hooks/useApi", () => ({
  api: {
    getHabits: vi.fn(),
    getCheckIns: vi.fn(),
    getStreaks: vi.fn(),
    createCheckIn: vi.fn(),
    deleteCheckIn: vi.fn(),
  },
}));

import { api } from "@/hooks/useApi";

const mockGetHabits = vi.mocked(api.getHabits);
const mockGetCheckIns = vi.mocked(api.getCheckIns);
const mockGetStreaks = vi.mocked(api.getStreaks);
const mockCreateCheckIn = vi.mocked(api.createCheckIn);
const mockDeleteCheckIn = vi.mocked(api.deleteCheckIn);

describe("TodayView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetHabits.mockResolvedValue({ habits: mockHabits });
    mockGetCheckIns.mockResolvedValue({ checkIns: mockCheckIns });
    mockGetStreaks.mockResolvedValue(mockStreaks);
  });

  test("renders loading state initially", () => {
    render(<TodayView />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  test("renders habits after loading", async () => {
    render(<TodayView />);

    await waitFor(() => {
      expect(screen.getByText("Exercise")).toBeInTheDocument();
      expect(screen.getByText("Read")).toBeInTheDocument();
    });
  });

  test("displays Today as default date heading", async () => {
    render(<TodayView />);

    await waitFor(() => {
      expect(screen.getByText("Today")).toBeInTheDocument();
    });
  });

  test("shows completion progress", async () => {
    render(<TodayView />);

    await waitFor(() => {
      expect(screen.getByText("1 of 2 done")).toBeInTheDocument();
      expect(screen.getByText("50%")).toBeInTheDocument();
    });
  });

  test("shows streak info for habits", async () => {
    render(<TodayView />);

    await waitFor(() => {
      // Should show streak text (multiple habits, so multiple instances)
      const streakElements = screen.getAllByText("3d streak");
      expect(streakElements.length).toBeGreaterThan(0);
    });
  });

  test("shows empty state when no habits", async () => {
    mockGetHabits.mockResolvedValue({ habits: [] });
    mockGetCheckIns.mockResolvedValue({ checkIns: [] });

    render(<TodayView />);

    await waitFor(() => {
      expect(screen.getByText("No habits yet")).toBeInTheDocument();
      expect(screen.getByText("Create some habits to start tracking!")).toBeInTheDocument();
    });
  });

  test("navigates to previous day", async () => {
    const user = userEvent.setup();
    render(<TodayView />);

    await waitFor(() => {
      expect(screen.getByText("Today")).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText("Previous day"));

    await waitFor(() => {
      expect(screen.getByText("Yesterday")).toBeInTheDocument();
    });
  });

  test("shows Jump to Today button when not on today", async () => {
    const user = userEvent.setup();
    render(<TodayView />);

    await waitFor(() => {
      expect(screen.getByText("Today")).toBeInTheDocument();
    });

    // Jump to Today should not be visible when already on today
    expect(screen.queryByText("Jump to Today")).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("Previous day"));

    await waitFor(() => {
      expect(screen.getByText("Jump to Today")).toBeInTheDocument();
    });
  });

  test("marks a habit as done", async () => {
    const user = userEvent.setup();
    mockCreateCheckIn.mockResolvedValue({
      checkIn: { id: "c2", habitId: "h2", date: "2025-03-10", status: "done" },
    });

    render(<TodayView />);

    await waitFor(() => {
      expect(screen.getByText("Read")).toBeInTheDocument();
    });

    // Click the done button for "Read" habit
    await user.click(screen.getByLabelText("Mark Read as done"));

    await waitFor(() => {
      expect(mockCreateCheckIn).toHaveBeenCalled();
    });
  });

  test("skips a habit", async () => {
    const user = userEvent.setup();
    mockCreateCheckIn.mockResolvedValue({
      checkIn: { id: "c3", habitId: "h2", date: "2025-03-10", status: "skipped" },
    });

    render(<TodayView />);

    await waitFor(() => {
      expect(screen.getByText("Read")).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText("Skip Read"));

    await waitFor(() => {
      expect(mockCreateCheckIn).toHaveBeenCalled();
    });
  });

  test("habit descriptions are shown", async () => {
    render(<TodayView />);

    await waitFor(() => {
      expect(screen.getByText("Daily workout")).toBeInTheDocument();
    });
  });

  test("next day button is disabled on today", async () => {
    render(<TodayView />);

    await waitFor(() => {
      expect(screen.getByText("Today")).toBeInTheDocument();
    });

    const nextButton = screen.getByLabelText("Next day");
    expect(nextButton).toBeDisabled();
  });
});
