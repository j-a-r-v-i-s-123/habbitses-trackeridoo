import { useState, useEffect } from "react";
import { api } from "@/hooks/useApi";
import AuthForm from "@/components/AuthForm";
import TodayView from "@/components/TodayView";
import Dashboard from "@/components/Dashboard";

type Page = "today" | "dashboard";

function App() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [page, setPage] = useState<Page>("today");

  useEffect(() => {
    api.me().then(() => setAuthed(true)).catch(() => setAuthed(false));
  }, []);

  async function handleLogout() {
    try {
      await api.logout();
    } catch {
      // ignore
    }
    setAuthed(false);
    setPage("today");
  }

  if (authed === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!authed) {
    return <AuthForm onAuth={() => setAuthed(true)} />;
  }

  if (page === "dashboard") {
    return <Dashboard onBack={() => setPage("today")} />;
  }

  return (
    <TodayView
      onLogout={handleLogout}
      onDashboard={() => setPage("dashboard")}
    />
  );
}

export default App;
