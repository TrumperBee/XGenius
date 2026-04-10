'use client';

import { useState } from 'react';
import { useNotifications } from '@/lib/notificationService';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { Bell, Smartphone, Moon, Star, Clock, Check, AlertCircle, Globe } from 'lucide-react';

export default function NotificationSettingsPage() {
  const {
    preferences,
    updatePreferences,
    requestPermission,
    hasPermission,
    isSupported,
  } = useNotifications();

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleEnableNotifications = async () => {
    const granted = await requestPermission();
    if (granted) {
      updatePreferences({ enabled: true });
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notification Settings</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Manage how and when you receive match alerts
          </p>
        </div>
        {saved && (
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <Check className="w-4 h-4" />
            Saved
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Enable Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!isSupported ? (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-[var(--bg-tertiary)]">
              <AlertCircle className="w-5 h-5 text-yellow-400" />
              <div>
                <p className="text-sm font-medium">Notifications Not Supported</p>
                <p className="text-xs text-[var(--text-muted)]">
                  Your browser does not support push notifications
                </p>
              </div>
            </div>
          ) : !hasPermission ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-[var(--bg-tertiary)]">
                <Smartphone className="w-5 h-5 text-blue-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Enable Browser Notifications</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Get instant alerts for matches and predictions
                  </p>
                </div>
              </div>
              <button
                onClick={handleEnableNotifications}
                className="w-full py-3 rounded-lg bg-[var(--accent-blue)] hover:bg-[#2563eb] text-white font-medium transition-colors"
              >
                Enable Notifications
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">Notifications Enabled</p>
                  <p className="text-xs text-green-400">Browser notifications are active</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.enabled}
                  onChange={(e) => updatePreferences({ enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[var(--bg-tertiary)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-green)]"></div>
              </label>
            </div>
          )}
        </CardContent>
      </Card>

      {hasPermission && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5" />
                Notification Types
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-[var(--border-color)]">
                <div>
                  <p className="text-sm font-medium">Match Starting</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Get reminded before matches kick off
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={preferences.matchStartMinutes}
                    onChange={(e) => updatePreferences({ matchStartMinutes: parseInt(e.target.value) })}
                    disabled={!preferences.matchStarting}
                    className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded px-2 py-1 text-sm disabled:opacity-50"
                  >
                    <option value={5}>5 min</option>
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                    <option value={60}>1 hour</option>
                  </select>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.matchStarting}
                      onChange={(e) => updatePreferences({ matchStarting: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[var(--bg-tertiary)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-green)]"></div>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-[var(--border-color)]">
                <div>
                  <p className="text-sm font-medium">Prediction Results</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Notify when your predictions are resolved
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.predictionResults}
                    onChange={(e) => updatePreferences({ predictionResults: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[var(--bg-tertiary)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-green)]"></div>
                </label>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-[var(--border-color)]">
                <div>
                  <p className="text-sm font-medium">Daily Summary</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Morning briefing with today's matches
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.dailySummary}
                    onChange={(e) => updatePreferences({ dailySummary: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[var(--bg-tertiary)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-green)]"></div>
                </label>
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">Favourite Team Alerts</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Special notifications for your teams
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.favouriteTeam}
                    onChange={(e) => updatePreferences({ favouriteTeam: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[var(--bg-tertiary)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-green)]"></div>
                </label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Moon className="w-5 h-5" />
                Quiet Hours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Enable Quiet Hours</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      Pause notifications during specific hours
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.quietHoursEnabled}
                      onChange={(e) => updatePreferences({ quietHoursEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[var(--bg-tertiary)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-green)]"></div>
                  </label>
                </div>

                {preferences.quietHoursEnabled && (
                  <div className="flex items-center gap-4 pt-4 border-t border-[var(--border-color)]">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[var(--text-muted)]" />
                      <span className="text-sm">From</span>
                      <input
                        type="time"
                        value={preferences.quietHoursStart}
                        onChange={(e) => updatePreferences({ quietHoursStart: e.target.value })}
                        className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded px-3 py-1.5 text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">To</span>
                      <input
                        type="time"
                        value={preferences.quietHoursEnd}
                        onChange={(e) => updatePreferences({ quietHoursEnd: e.target.value })}
                        className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded px-3 py-1.5 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <button
            onClick={handleSave}
            className="w-full py-3 rounded-lg bg-[var(--accent-green)] hover:bg-emerald-500 text-white font-medium transition-colors"
          >
            Save Settings
          </button>
        </>
      )}
    </div>
  );
}
