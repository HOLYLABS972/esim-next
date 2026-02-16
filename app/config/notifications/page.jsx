'use client';

import { useState, useEffect } from 'react';
import { Bell, Send, Loader2, Users, User, TrendingUp, CheckCircle, XCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function NotificationsPage() {
  const [sending, setSending] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);
  const [stats, setStats] = useState(null);
  const [form, setForm] = useState({
    target: 'all', // 'all' | 'single'
    userId: '',
    title: '',
    body: '',
    channelId: 'default',
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch('/api/push-notifications/send', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSend = async () => {
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!form.body.trim()) {
      toast.error('Message body is required');
      return;
    }

    if (form.target === 'single' && !form.userId.trim()) {
      toast.error('User ID is required when sending to single user');
      return;
    }

    setSending(true);
    try {
      const payload = {
        title: form.title.trim(),
        body: form.body.trim(),
        channelId: form.channelId,
      };

      if (form.target === 'all') {
        payload.all = true;
      } else if (form.target === 'single') {
        payload.userId = form.userId.trim();
      }

      const res = await fetch('/api/push-notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(`✅ Sent to ${data.userCount} user(s)`);
        setForm({ ...form, title: '', body: '', userId: '' });
        loadStats(); // Reload stats after sending
      } else {
        toast.error(data.error || 'Failed to send notification');
        if (data.details) {
          console.error('Error details:', data.details);
        }
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error('Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  const handleTestNotification = () => {
    setForm({
      target: 'all',
      userId: '',
      title: '🎉 Welcome to GlobalBanka!',
      body: 'Stay connected worldwide with our affordable eSIM plans.',
      channelId: 'promotions',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Bell className="w-7 h-7 text-blue-600 dark:text-blue-400" />
          Push Notifications
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Send push notifications to users' mobile devices
        </p>
      </div>

      {/* Statistics Cards */}
      {!loadingStats && stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Users</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.usersWithPushTokens || 0}
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Sent</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.stats?.total || 0}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Successful</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {stats.stats?.sent || 0}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Failed</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                  {stats.stats?.failed || 0}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>
      )}

      {/* Send Notification Form */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Send Notification</h3>
          <button
            onClick={handleTestNotification}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Load example
          </button>
        </div>

        <div className="space-y-6 max-w-2xl">
          {/* Target Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Send to
            </label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="target"
                  value="all"
                  checked={form.target === 'all'}
                  onChange={(e) => setForm({ ...form, target: e.target.value, userId: '' })}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <Users className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">All users with notifications enabled</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="target"
                  value="single"
                  checked={form.target === 'single'}
                  onChange={(e) => setForm({ ...form, target: e.target.value })}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Single user by ID</span>
              </label>
            </div>
          </div>

          {/* User ID input (if single) */}
          {form.target === 'single' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                User ID *
              </label>
              <input
                type="text"
                value={form.userId}
                onChange={(e) => setForm({ ...form, userId: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter user UUID"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Find user ID in the Users tab
              </p>
            </div>
          )}

          {/* Channel */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notification Channel (Android)
            </label>
            <select
              value={form.channelId}
              onChange={(e) => setForm({ ...form, channelId: e.target.value })}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="default">Default (High Priority)</option>
              <option value="orders">Orders & Purchases</option>
              <option value="promotions">Promotions (Lower Priority)</option>
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Channels control notification importance on Android devices
            </p>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value.slice(0, 65) })}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g. New eSIM Package Available!"
              maxLength={65}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {form.title.length}/65 characters
            </p>
          </div>

          {/* Body */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Message *
            </label>
            <textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value.slice(0, 240) })}
              rows={4}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter notification message..."
              maxLength={240}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {form.body.length}/240 characters
            </p>
          </div>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={sending || !form.title.trim() || !form.body.trim()}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors shadow-sm hover:shadow"
          >
            {sending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Send Notification
              </>
            )}
          </button>
        </div>
      </div>

      {/* Testing Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <div className="flex gap-3">
          <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">💡 Testing Push Notifications</p>
            <p className="mb-2">
              Use the{' '}
              <a
                href="https://expo.dev/notifications"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:no-underline font-medium"
              >
                Expo Push Notification Tool
              </a>{' '}
              to send test notifications directly to your device.
            </p>
            <p className="text-xs font-mono bg-blue-100 dark:bg-blue-900/40 px-2 py-1 rounded inline-block">
              Your test token: fC_soPnHdyxbu9rS3Cx00epLbbU-SqnqigMfOi1r
            </p>
          </div>
        </div>
      </div>

      {/* Recent Notifications */}
      {!loadingStats && stats?.recentNotifications && stats.recentNotifications.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Notifications
          </h3>
          <div className="space-y-3">
            {stats.recentNotifications.slice(0, 10).map((notification) => (
              <div
                key={notification.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex-shrink-0 mt-1">
                  {notification.status === 'sent' && (
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  )}
                  {notification.status === 'failed' && (
                    <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  )}
                  {notification.status === 'pending' && (
                    <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {notification.title}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                    {notification.body}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      {new Date(notification.sent_at).toLocaleString()}
                    </p>
                    {notification.error_message && (
                      <p className="text-xs text-red-600 dark:text-red-400">
                        Error: {notification.error_message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
