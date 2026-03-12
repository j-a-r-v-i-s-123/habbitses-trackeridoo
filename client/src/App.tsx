import { useState, useEffect } from "react";
import { api, setApiToast } from "@/hooks/useApi";
import AuthForm from "@/components/AuthForm";
import TodayView from "@/components/TodayView";
import Dashboard from "@/components/Dashboard";
import HabitsView from "@/components/HabitsView";
import SettingsView from "@/components/SettingsView";
import Layout from "@/components/Layout";
import ErrorBoundary from "@/components/ErrorBoundary";
import Onboarding from "@/components/Onboarding";
import { ToastProvider, useToast } from "@/components/Toast";

type Page = "today" | "dashboard" | "habits" | "settings";

function AppContent() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [page, setPage] = useState<Page>("today");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { toast } = useToast();

  // Wire up API toast notifications
  useEffect(() => {
    setApiToast(toast);
    return () => setApiToast(null);
  }, [toast]);

  useEffect(() => {
    api.me().then(() => {
      setAuthed(true);
      if (!localStorage.getItem("onboarding_completed")) {
        setShowOnboarding(true);
      }
    }).catch(() => setAuthed(false));
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
    return <AuthForm onAuth={() => {
      setAuthed(true);
      if (!localStorage.getItem("onboarding_completed")) {
        setShowOnboarding(true);
      }
    }} />;
  }

  return (
    <Layout page={page} onNavigate={setPage} onLogout={handleLogout}>
      {showOnboarding && (
        <Onboarding onComplete={() => setShowOnboarding(false)} />
      )}
      {page === "dashboard" && (
        <ErrorBoundary key="dashboard" fallbackTitle="Dashboard failed to load">
          <Dashboard />
        </ErrorBoundary>
      )}
      {page === "today" && (
        <ErrorBoundary key="today" fallbackTitle="Today view failed to load">
          <TodayView />
        </ErrorBoundary>
      )}
      {page === "habits" && (
        <ErrorBoundary key="habits" fallbackTitle="Habits view failed to load">
          <HabitsView />
        </ErrorBoundary>
      )}
      {page === "settings" && (
        <ErrorBoundary key="settings" fallbackTitle="Settings failed to load">
          <SettingsView />
        </ErrorBoundary>
      )}
    </Layout>
  );
}

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

export default App;
