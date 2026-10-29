import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationsApi } from '../../api/tasks';
import { Bell, Check, CheckCircle2, AlertCircle, MessageSquare, ArrowRight } from 'lucide-react';

interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  task_id: number | null;
  created_at: string;
}

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await notificationsApi.list();
      setNotifications(data?.data || []);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      alert('Failed to mark all notifications as read');
    }
  };

  const handleItemClick = async (notif: NotificationItem) => {
    if (!notif.is_read) {
      await notificationsApi.markAsRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
    }
    if (notif.task_id) {
      navigate(`/tasks/${notif.task_id}`);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Notifications</h1>
          <p className="text-sm text-slate-600 mt-1">
            Stay updated on task assignments, submitted deliverables, review decisions, and team comments.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-1.5 h-9 px-4 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-sm font-semibold transition cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Mark all as read</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Bell className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700 text-sm">No notifications found.</p>
            <p className="text-xs text-slate-500 mt-1">You are up to date on all task activity.</p>
          </div>
        ) : (
          notifications.map((notif) => {
            let icon = <Bell className="w-4 h-4 text-blue-600" />;
            let iconBg = 'bg-blue-50 border-blue-100';

            if (notif.type.includes('return')) {
              icon = <AlertCircle className="w-4 h-4 text-red-600" />;
              iconBg = 'bg-red-50 border-red-100';
            } else if (notif.type.includes('approved') || notif.type.includes('completed')) {
              icon = <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
              iconBg = 'bg-emerald-50 border-emerald-100';
            } else if (notif.type.includes('comment')) {
              icon = <MessageSquare className="w-4 h-4 text-sky-600" />;
              iconBg = 'bg-sky-50 border-sky-100';
            }

            return (
              <div
                key={notif.id}
                onClick={() => handleItemClick(notif)}
                className={`p-4 sm:p-5 flex items-start justify-between gap-4 transition cursor-pointer hover:bg-slate-50 ${
                  !notif.is_read ? 'bg-blue-50/20' : ''
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${iconBg}`}>
                    {icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">{notif.title}</h3>
                      {!notif.is_read && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mt-1 leading-relaxed">{notif.message}</p>
                    <span className="text-xs text-slate-400 font-medium mt-1.5 inline-block">
                      {new Date(notif.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                {notif.task_id && (
                  <span className="text-slate-400 hover:text-blue-600 shrink-0 p-1">
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
