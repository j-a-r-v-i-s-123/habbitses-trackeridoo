import { useTheme } from "./Layout";

export default function SettingsView() {
  const { darkMode, toggleDarkMode } = useTheme();

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Settings
      </h2>

      <div className="space-y-4">
        {/* Appearance */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
              Appearance
            </h3>
          </div>
          <div className="px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Dark Mode</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Switch between light and dark themes
                </p>
              </div>
              <button
                onClick={toggleDarkMode}
                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  ${darkMode ? "bg-primary-600" : "bg-gray-300 dark:bg-gray-600"}
                `}
                role="switch"
                aria-checked={darkMode}
              >
                <span
                  className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    ${darkMode ? "translate-x-6" : "translate-x-1"}
                  `}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Account */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
              Account
            </h3>
          </div>
          <div className="px-5 py-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Account management features coming soon.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
