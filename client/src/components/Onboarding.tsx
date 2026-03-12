import { useState } from "react";
import { api } from "@/hooks/useApi";

const ICONS: Record<string, string> = {
  star: "\u2B50", heart: "\u2764\uFE0F", fire: "\uD83D\uDD25",
  book: "\uD83D\uDCD6", run: "\uD83C\uDFC3", water: "\uD83D\uDCA7",
  sleep: "\uD83D\uDE34", meditate: "\uD83E\uDDD8", code: "\uD83D\uDCBB",
  music: "\uD83C\uDFB5", gym: "\uD83C\uDFCB\uFE0F", food: "\uD83C\uDF4E",
  plant: "\uD83C\uDF31", brain: "\uD83E\uDDE0", writing: "\u270D\uFE0F",
};

interface HabitTemplate {
  label: string;
  name: string;
  description: string;
  frequency: string;
  color: string;
  icon: string;
}

const TEMPLATES: HabitTemplate[] = [
  { label: "Exercise", name: "Exercise", description: "Get moving every day", frequency: "daily", color: "#e74c3c", icon: "run" },
  { label: "Meditation", name: "Meditation", description: "Mindfulness practice", frequency: "daily", color: "#9b59b6", icon: "meditate" },
  { label: "Reading", name: "Reading", description: "Read for at least 20 minutes", frequency: "daily", color: "#f39c12", icon: "book" },
  { label: "Drink Water", name: "Drink Water", description: "Stay hydrated — 8 glasses a day", frequency: "daily", color: "#3498db", icon: "water" },
  { label: "Journaling", name: "Journaling", description: "Write down your thoughts", frequency: "daily", color: "#1abc9c", icon: "writing" },
  { label: "Learn Something", name: "Learn Something New", description: "Spend time learning a new skill", frequency: "daily", color: "#e91e63", icon: "brain" },
];

type Step = "welcome" | "create-habit" | "tips";

interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<Step>("welcome");
  const [selectedTemplate, setSelectedTemplate] = useState<HabitTemplate | null>(null);
  const [customName, setCustomName] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleCreateHabit() {
    const name = selectedTemplate ? selectedTemplate.name : customName.trim();
    if (!name) {
      setError("Please enter a habit name");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await api.createHabit({
        name,
        description: selectedTemplate ? selectedTemplate.description : customDescription.trim() || undefined,
        frequency: selectedTemplate?.frequency || "daily",
        color: selectedTemplate?.color || "#5b4fcf",
        icon: selectedTemplate?.icon || "star",
      });
      setStep("tips");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create habit");
    } finally {
      setSaving(false);
    }
  }

  function handleSkipCreate() {
    setStep("tips");
  }

  function handleFinish() {
    localStorage.setItem("onboarding_completed", "true");
    onComplete();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Step indicator */}
        <div className="px-6 pt-5 pb-2">
          <div className="flex gap-1.5">
            {(["welcome", "create-habit", "tips"] as Step[]).map((s, i) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= ["welcome", "create-habit", "tips"].indexOf(step)
                    ? "bg-primary-600"
                    : "bg-gray-200 dark:bg-gray-700"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Welcome Step */}
        {step === "welcome" && (
          <div className="px-6 py-6 text-center">
            <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome to Habit Tracker!
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
              Build better habits, one day at a time. Track your daily progress,
              build streaks, and see your growth on the dashboard.
            </p>

            <div className="space-y-3 text-left mb-6">
              <FeatureRow
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                }
                title="Daily check-ins"
                description="Mark habits as done or skipped each day"
              />
              <FeatureRow
                icon={<span className="text-lg">{ICONS.fire}</span>}
                title="Streak tracking"
                description="Stay motivated with current and best streaks"
              />
              <FeatureRow
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                }
                title="Analytics dashboard"
                description="Visualize your progress with heatmaps and charts"
              />
            </div>

            <button
              onClick={() => setStep("create-habit")}
              className="w-full px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors"
            >
              Get Started
            </button>
          </div>
        )}

        {/* Create First Habit Step */}
        {step === "create-habit" && (
          <div className="px-6 py-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
              Create your first habit
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              Pick a template or create your own. You can always add more later.
            </p>

            {error && (
              <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg mb-4">
                {error}
              </div>
            )}

            {/* Templates */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {TEMPLATES.map((t) => {
                const isSelected = selectedTemplate?.label === t.label;
                return (
                  <button
                    key={t.label}
                    type="button"
                    onClick={() => {
                      setSelectedTemplate(isSelected ? null : t);
                      setCustomName("");
                      setCustomDescription("");
                    }}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 transition-colors text-left ${
                      isSelected
                        ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                        : "border-gray-200 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-600"
                    }`}
                  >
                    <span
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                      style={{ backgroundColor: t.color + "20" }}
                    >
                      {ICONS[t.icon]}
                    </span>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Or create custom */}
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-700" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  or create your own
                </span>
              </div>
            </div>

            <div className="space-y-3 mb-5">
              <input
                type="text"
                value={customName}
                onChange={(e) => {
                  setCustomName(e.target.value);
                  if (e.target.value) setSelectedTemplate(null);
                }}
                placeholder="Habit name (e.g. Morning Run)"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <input
                type="text"
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                placeholder="Description (optional)"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSkipCreate}
                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 font-medium text-sm transition-colors"
              >
                Skip for now
              </button>
              <button
                type="button"
                onClick={handleCreateHabit}
                disabled={saving || (!selectedTemplate && !customName.trim())}
                className="flex-1 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium text-sm transition-colors disabled:opacity-50"
              >
                {saving ? "Creating..." : "Create Habit"}
              </button>
            </div>
          </div>
        )}

        {/* Tips Step */}
        {step === "tips" && (
          <div className="px-6 py-6 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              You're all set!
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Here are a few tips to help you get the most out of Habit Tracker.
            </p>

            <div className="space-y-3 text-left mb-6">
              <TipRow
                emoji={ICONS.fire}
                title="Build streaks"
                description="Check in daily to build streaks. Your current streak shows below each habit."
              />
              <TipRow
                emoji="\u23ED\uFE0F"
                title="Skip, don't break"
                description="Use the skip button when you intentionally rest. Skipped days won't break your streak."
              />
              <TipRow
                emoji="\uD83D\uDCCA"
                title="Track your progress"
                description="Visit the Dashboard to see your completion heatmap, charts, and stats."
              />
              <TipRow
                emoji="\uD83D\uDD14"
                title="Set reminders"
                description="Go to Settings to enable email reminders for each habit."
              />
            </div>

            <button
              onClick={handleFinish}
              className="w-full px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors"
            >
              Start Tracking
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function FeatureRow({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
      <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-600 dark:text-primary-400 flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      </div>
    </div>
  );
}

function TipRow({ emoji, title, description }: { emoji: string; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
      <span className="text-lg flex-shrink-0 mt-0.5">{emoji}</span>
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      </div>
    </div>
  );
}
