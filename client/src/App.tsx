import { useState, useEffect } from "react";
import { api } from "@/hooks/useApi";
import AuthForm from "@/components/AuthForm";
import TodayView from "@/components/TodayView";
import Dashboard from "@/components/Dashboard";
import HabitsView from "@/components/HabitsView";
import SettingsView from "@/components/SettingsView";
import Layout from "@/components/Layout";

type Page = "today" | "dashboard" | "habits" | "settings";

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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400 dark:text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!authed) {
    return <AuthForm onAuth={() => setAuthed(true)} />;
  }

  return (
    <Layout page={page} onNavigate={setPage} onLogout={handleLogout}>
      {page === "dashboard" && <Dashboard />}
      {page === "today" && <TodayView />}
      {page === "habits" && <HabitsView />}
      {page === "settings" && <SettingsView />}
    </Layout>
  );
}

export default App;
