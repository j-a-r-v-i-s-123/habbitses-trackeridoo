import { useState, useEffect } from "react";
import { useTheme } from "./Layout";
import { api, ReminderSetting } from "@/hooks/useApi";

export default function SettingsView() {
  const { darkMode, toggleDarkMode } = useTheme();
  const [reminders, setReminders] = useState<ReminderSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  // Profile state
  const [profile, setProfile] = useState({ name: "", email: "" });
  const [profileMsg, setProfileMsg] = useState("");
  const [profileErr, setProfileErr] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Password state
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordErr, setPasswordErr] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Delete account state
  const [deletePassword, setDeletePassword] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteErr, setDeleteErr] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([
      api.getReminders(),
      api.me(),
    ]).then(([remRes, meRes]) => {
      setReminders(remRes.reminders);
      setProfile({ name: meRes.user.name || "", email: meRes.user.email });
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function toggleReminder(habit: ReminderSetting) {
    setSaving(habit.id);
    try {
      const newEnabled = !habit.reminderEnabled;
      const res = await api.updateReminder(
        habit.id,
        newEnabled,
        habit.reminderTime || "09:00",
      );
      setReminders((prev) =>
        prev.map((r) => (r.id === habit.id ? res.reminder : r)),
      );
    } catch (err) {
      console.error("Failed to toggle reminder:", err);
    } finally {
      setSaving(null);
    }
  }

  async function updateTime(habitId: string, time: string) {
    setSaving(habitId);
    try {
      const res = await api.updateReminder(habitId, true, time);
      setReminders((prev) =>
        prev.map((r) => (r.id === habitId ? res.reminder : r)),
      );
    } catch (err) {
      console.error("Failed to update reminder time:", err);
    } finally {
      setSaving(null);
    }
  }

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg("");
    setProfileErr("");
    try {
      const { user } = await api.updateProfile({
        name: profile.name.trim() || undefined,
        email: profile.email.trim(),
      });
      setProfile({ name: user.name || "", email: user.email });
      setProfileMsg("Profile updated");
    } catch (err: unknown) {
      setProfileErr(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg("");
    setPasswordErr("");

    if (passwords.new !== passwords.confirm) {
      setPasswordErr("New passwords don't match");
      return;
    }
    if (passwords.new.length < 8) {
      setPasswordErr("New password must be at least 8 characters");
      return;
    }

    setSavingPassword(true);
    try {
      await api.changePassword(passwords.current, passwords.new);
      setPasswordMsg("Password changed successfully");
      setPasswords({ current: "", new: "", confirm: "" });
    } catch (err: unknown) {
      setPasswordErr(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleDeleteAccount() {
    if (!deletePassword) {
      setDeleteErr("Password is required");
      return;
    }
    setDeleting(true);
    setDeleteErr("");
    try {
      await api.deleteAccount(deletePassword);
      window.location.reload();
    } catch (err: unknown) {
      setDeleteErr(err instanceof Error ? err.message : "Failed to delete account");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Settings
      </h2>

      <div className="space-y-4">
        {/* Appearance */}
        <Section title="Appearance">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Dark Mode</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Switch between light and dark themes
              </p>
            </div>
            <Toggle checked={darkMode} onChange={toggleDarkMode} />
          </div>
        </Section>

        {/* Profile */}
        <Section title="Profile">
          {loading ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">Loading...</p>
          ) : (
            <form onSubmit={handleProfileSave} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                />
              </div>
              {profileMsg && <p className="text-sm text-green-600 dark:text-green-400">{profileMsg}</p>}
              {profileErr && <p className="text-sm text-red-600 dark:text-red-400">{profileErr}</p>}
              <button
                type="submit"
                disabled={savingProfile}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {savingProfile ? "Saving..." : "Save Profile"}
              </button>
            </form>
          )}
        </Section>

        {/* Change Password */}
        <Section title="Change Password">
          <form onSubmit={handlePasswordChange} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Password</label>
              <input
                type="password"
                value={passwords.current}
                onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
              <input
                type="password"
                value={passwords.new}
                onChange={(e) => setPasswords((p) => ({ ...p, new: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={passwords.confirm}
                onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>
            {passwordMsg && <p className="text-sm text-green-600 dark:text-green-400">{passwordMsg}</p>}
            {passwordErr && <p className="text-sm text-red-600 dark:text-red-400">{passwordErr}</p>}
            <button
              type="submit"
              disabled={savingPassword}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {savingPassword ? "Changing..." : "Change Password"}
            </button>
          </form>
        </Section>

        {/* Reminders */}
        <Section title="Reminders">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Enable email reminders per habit. You'll receive a notification at the chosen time.
          </p>

          {loading ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Loading habits...
            </p>
          ) : reminders.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              No habits found. Create a habit first to set up reminders.
            </p>
          ) : (
            <div className="space-y-3">
              {reminders.map((habit) => (
                <div
                  key={habit.id}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {habit.name}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {habit.reminderEnabled && (
                      <input
                        type="time"
                        value={habit.reminderTime || "09:00"}
                        onChange={(e) => updateTime(habit.id, e.target.value)}
                        disabled={saving === habit.id}
                        className="text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 text-gray-900 dark:text-white"
                      />
                    )}
                    <Toggle
                      checked={habit.reminderEnabled}
                      onChange={() => toggleReminder(habit)}
                      disabled={saving === habit.id}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Danger Zone */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-red-200 dark:border-red-900/50 overflow-hidden">
          <div className="px-5 py-4 border-b border-red-200 dark:border-red-900/50">
            <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">
              Danger Zone
            </h3>
          </div>
          <div className="px-5 py-4">
            {!showDeleteConfirm ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Delete Account</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Permanently delete your account and all data
                  </p>
                </div>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 text-sm font-medium text-red-600 border border-red-300 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Delete Account
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                  This action cannot be undone. All your habits, check-ins, and data will be permanently deleted.
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Enter your password to confirm
                  </label>
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                    placeholder="Your password"
                  />
                </div>
                {deleteErr && <p className="text-sm text-red-600 dark:text-red-400">{deleteErr}</p>}
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowDeleteConfirm(false); setDeletePassword(""); setDeleteErr(""); }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {deleting ? "Deleting..." : "Permanently Delete"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
          {title}
        </h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full transition-colors
        ${checked ? "bg-primary-600" : "bg-gray-300 dark:bg-gray-600"}
        ${disabled ? "opacity-50" : ""}
      `}
      role="switch"
      aria-checked={checked}
    >
      <span
        className={`
          inline-block h-4 w-4 transform rounded-full bg-white transition-transform
          ${checked ? "translate-x-6" : "translate-x-1"}
        `}
      />
    </button>
  );
}
