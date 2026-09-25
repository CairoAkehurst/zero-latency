import { X, User, Bell, Shield, Paintbrush } from "lucide-react";

interface SettingsPeekProps {
  onClose: () => void;
}

export function SettingsPeek({ onClose }: SettingsPeekProps) {
  return (
    <div className="w-[500px] flex-shrink-0 border-l border-gray-100 bg-white flex flex-col h-full shadow-[-4px_0_24px_rgba(0,0,0,0.02)]">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Settings</h2>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Profile Section */}
        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-gray-500" />
            Account
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
              <input type="text" defaultValue="Cairo Akehurst" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input type="email" defaultValue="cairo@example.com" disabled className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500" />
            </div>
          </div>
        </section>

        <hr className="border-gray-100" />

        {/* Preferences Section */}
        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Paintbrush className="w-4 h-4 text-gray-500" />
            Appearance
          </h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input type="radio" name="theme" defaultChecked className="text-blue-600 focus:ring-blue-500" />
              <span className="text-sm text-gray-700">Light Mode</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="radio" name="theme" disabled className="text-gray-400 focus:ring-gray-400" />
              <span className="text-sm text-gray-400">Dark Mode (Coming Soon)</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="radio" name="theme" disabled className="text-gray-400 focus:ring-gray-400" />
              <span className="text-sm text-gray-400">System Default</span>
            </label>
          </div>
        </section>

        <hr className="border-gray-100" />

        {/* Notifications Section */}
        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Bell className="w-4 h-4 text-gray-500" />
            Notifications
          </h3>
          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-700">Email Notifications</span>
              <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                <input type="checkbox" name="toggle" id="toggle1" className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer" defaultChecked/>
                <label htmlFor="toggle1" className="toggle-label block overflow-hidden h-5 rounded-full bg-blue-500 cursor-pointer"></label>
              </div>
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-700">Desktop Push Notifications</span>
              <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                <input type="checkbox" name="toggle" id="toggle2" className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer" />
                <label htmlFor="toggle2" className="toggle-label block overflow-hidden h-5 rounded-full bg-gray-300 cursor-pointer"></label>
              </div>
            </label>
          </div>
        </section>
      </div>

      <div className="p-4 border-t border-gray-100">
        <button 
          onClick={onClose}
          className="w-full py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}
