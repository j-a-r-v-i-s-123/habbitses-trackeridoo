import { useState, useEffect } from "react";
import { api } from "@/hooks/useApi";
import AuthForm from "@/components/AuthForm";
import TodayView from "@/components/TodayView";

function App() {
  const [authed, setAuthed] = useState<boolean | null>(null);

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

  return <TodayView onLogout={handleLogout} />;
}

export default App;
