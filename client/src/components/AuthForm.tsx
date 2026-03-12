import { useState } from "react";
import { api } from "@/hooks/useApi";

interface AuthFormProps {
  onAuth: () => void;
}

type Mode = "login" | "register" | "forgot" | "reset";

export default function AuthForm({ onAuth }: AuthFormProps) {
  const [mode, setMode] = useState<Mode>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("token") ? "reset" : "login";
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (mode === "login") {
        await api.login(email, password);
        onAuth();
      } else if (mode === "register") {
        await api.register(email, password, name || undefined);
        onAuth();
      } else if (mode === "forgot") {
        const res = await api.forgotPassword(email);
        setMessage(res.message);
      } else if (mode === "reset") {
        if (password !== confirmPassword) {
          setError("Passwords don't match");
          setLoading(false);
          return;
        }
        const params = new URLSearchParams(window.location.search);
        const token = params.get("token");
        if (!token) {
          setError("Missing reset token");
          setLoading(false);
          return;
        }
        const res = await api.resetPassword(token, password);
        setMessage(res.message + " You can now log in.");
        // Clean up URL
        window.history.replaceState({}, "", "/");
        setTimeout(() => setMode("login"), 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function switchMode(newMode: Mode) {
    setMode(newMode);
    setError("");
    setMessage("");
  }

  const title = {
    login: "Log In",
    register: "Sign Up",
    forgot: "Reset Password",
    reset: "Set New Password",
  }[mode];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-1">
          Habit Tracker
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">{title}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <input
              type="text"
              placeholder="Name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
          )}

          {(mode === "login" || mode === "register" || mode === "forgot") && (
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
          )}

          {(mode === "login" || mode === "register" || mode === "reset") && (
            <input
              type="password"
              placeholder={mode === "reset" ? "New password" : "Password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
          )}

          {mode === "reset" && (
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {message && <p className="text-green-600 dark:text-green-400 text-sm">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {loading
              ? "..."
              : mode === "login"
                ? "Log In"
                : mode === "register"
                  ? "Sign Up"
                  : mode === "forgot"
                    ? "Send Reset Link"
                    : "Reset Password"}
          </button>
        </form>

        <div className="mt-4 space-y-2 text-center">
          {mode === "login" && (
            <>
              <button
                onClick={() => switchMode("forgot")}
                className="w-full text-sm text-gray-500 dark:text-gray-400 hover:underline"
              >
                Forgot password?
              </button>
              <button
                onClick={() => switchMode("register")}
                className="w-full text-sm text-primary-600 dark:text-primary-400 hover:underline"
              >
                Need an account? Sign up
              </button>
            </>
          )}
          {mode === "register" && (
            <button
              onClick={() => switchMode("login")}
              className="w-full text-sm text-primary-600 dark:text-primary-400 hover:underline"
            >
              Already have an account? Log in
            </button>
          )}
          {(mode === "forgot" || mode === "reset") && (
            <button
              onClick={() => switchMode("login")}
              className="w-full text-sm text-primary-600 dark:text-primary-400 hover:underline"
            >
              Back to login
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
