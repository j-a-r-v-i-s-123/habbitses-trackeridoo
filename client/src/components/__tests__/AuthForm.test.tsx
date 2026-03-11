import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, test, expect, vi, beforeEach } from "vitest";
import AuthForm from "../AuthForm";

// Mock the API module
vi.mock("@/hooks/useApi", () => ({
  api: {
    login: vi.fn(),
    register: vi.fn(),
  },
}));

import { api } from "@/hooks/useApi";

const mockLogin = vi.mocked(api.login);
const mockRegister = vi.mocked(api.register);

describe("AuthForm", () => {
  const mockOnAuth = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("renders login form by default", () => {
    render(<AuthForm onAuth={mockOnAuth} />);

    expect(screen.getByText("Habit Tracker")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    expect(screen.getByText("Log In")).toBeInTheDocument();
    expect(screen.getByText("Need an account? Sign up")).toBeInTheDocument();
    // Name field should NOT be present in login mode
    expect(screen.queryByPlaceholderText("Name (optional)")).not.toBeInTheDocument();
  });

  test("toggles to register form", async () => {
    const user = userEvent.setup();
    render(<AuthForm onAuth={mockOnAuth} />);

    await user.click(screen.getByText("Need an account? Sign up"));

    expect(screen.getByPlaceholderText("Name (optional)")).toBeInTheDocument();
    expect(screen.getByText("Sign Up")).toBeInTheDocument();
    expect(screen.getByText("Already have an account? Log in")).toBeInTheDocument();
  });

  test("toggles back to login form", async () => {
    const user = userEvent.setup();
    render(<AuthForm onAuth={mockOnAuth} />);

    await user.click(screen.getByText("Need an account? Sign up"));
    await user.click(screen.getByText("Already have an account? Log in"));

    expect(screen.queryByPlaceholderText("Name (optional)")).not.toBeInTheDocument();
    expect(screen.getByText("Log In")).toBeInTheDocument();
  });

  test("calls login API on login submit", async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValueOnce({ token: "test-token" });

    render(<AuthForm onAuth={mockOnAuth} />);

    await user.type(screen.getByPlaceholderText("Email"), "test@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "password123");
    await user.click(screen.getByText("Log In"));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("test@example.com", "password123");
      expect(mockOnAuth).toHaveBeenCalled();
    });
  });

  test("calls register API on signup submit", async () => {
    const user = userEvent.setup();
    mockRegister.mockResolvedValueOnce({ token: "test-token" });

    render(<AuthForm onAuth={mockOnAuth} />);

    await user.click(screen.getByText("Need an account? Sign up"));
    await user.type(screen.getByPlaceholderText("Name (optional)"), "Test");
    await user.type(screen.getByPlaceholderText("Email"), "test@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "password123");
    await user.click(screen.getByText("Sign Up"));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith("test@example.com", "password123", "Test");
      expect(mockOnAuth).toHaveBeenCalled();
    });
  });

  test("displays error message on login failure", async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValueOnce(new Error("Invalid email or password"));

    render(<AuthForm onAuth={mockOnAuth} />);

    await user.type(screen.getByPlaceholderText("Email"), "test@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "wrongpass");
    await user.click(screen.getByText("Log In"));

    await waitFor(() => {
      expect(screen.getByText("Invalid email or password")).toBeInTheDocument();
    });
    expect(mockOnAuth).not.toHaveBeenCalled();
  });

  test("clears error when toggling between login/register", async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValueOnce(new Error("Some error"));

    render(<AuthForm onAuth={mockOnAuth} />);

    await user.type(screen.getByPlaceholderText("Email"), "test@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "wrongpass");
    await user.click(screen.getByText("Log In"));

    await waitFor(() => {
      expect(screen.getByText("Some error")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Need an account? Sign up"));
    expect(screen.queryByText("Some error")).not.toBeInTheDocument();
  });
});
