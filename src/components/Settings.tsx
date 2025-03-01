import React, { useState } from 'react';
import { Settings as SettingsIcon, Bell, Moon, Sun, Globe, Shield } from 'lucide-react';

const Settings: React.FC = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [currency, setCurrency] = useState('USD');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Settings</h1>

      {/* Appearance */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
          <Sun className="h-5 w-5 mr-2" />
          Appearance
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Moon className="h-5 w-5 mr-2 text-gray-600" />
              <span>Dark Mode</span>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                darkMode ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  darkMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
          <Bell className="h-5 w-5 mr-2" />
          Notifications
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Enable Notifications</span>
            <button
              onClick={() => setNotifications(!notifications)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                notifications ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  notifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Currency Preferences */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
          <Globe className="h-5 w-5 mr-2" />
          Currency Preferences
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Display Currency</span>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="JPY">JPY (¥)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
          <Shield className="h-5 w-5 mr-2" />
          Security
        </h2>
        <div className="space-y-4">
          <button className="text-blue-600 hover:text-blue-800 font-medium">
            Change Password
          </button>
          <div className="border-t pt-4">
            <button className="text-blue-600 hover:text-blue-800 font-medium">
              Two-Factor Authentication
            </button>
          </div>
        </div>
      </div>

      {/* Account */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
          <SettingsIcon className="h-5 w-5 mr-2" />
          Account
        </h2>
        <div className="space-y-4">
          <button className="text-red-600 hover:text-red-800 font-medium">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;