import React from 'react';
import {
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation
} from '../../app/api/coreApiSlice';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { toast } from 'react-hot-toast';
import { Bell, CheckSquare, MessageSquare } from 'lucide-react';
import dayjs from 'dayjs';

export default function NotificationsPage() {
  const { data: response, isLoading, refetch } = useGetNotificationsQuery();
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead, { isLoading: isMarkingAll }] = useMarkAllNotificationsReadMutation();

  const notifications = response?.data || [];

  const handleMarkRead = async (id) => {
    try {
      await markRead(id).unwrap();
      refetch();
    } catch (err) {
      toast.error('Failed to update notification');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead().unwrap();
      toast.success('All notifications marked as read');
      refetch();
    } catch (err) {
      toast.error('Action failed');
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 items-start">
        <div className="flex items-center gap-2">
          <Bell className="w-6 h-6 text-[var(--color-primary-pink)]" />
          <h2 className="text-xl font-bold text-slate-805 dark:text-slate-100">Inbox Notifications</h2>
        </div>
        {notifications.some(n => !n.isRead) && (
          <Button onClick={handleMarkAllRead} isLoading={isMarkingAll} variant="outline" size="sm" className="gap-1.5">
            <CheckSquare className="w-4 h-4" />
            <span>Mark all read</span>
          </Button>
        )}
      </div>

      {isLoading ? (
        <Loader size="lg" className="py-10" />
      ) : notifications.length === 0 ? (
        <div className="text-center p-12 glass-card rounded-xl text-[var(--color-text-secondary)]">
          <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold">Your inbox is empty</p>
          <p className="text-xs text-slate-400 mt-1">We will notify you when new events happen.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n._id}
              onClick={() => !n.isRead && handleMarkRead(n._id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex gap-4 items-start ${
                n.isRead
                  ? 'bg-white dark:bg-slate-900 border-black/5 dark:border-white/5 opacity-70'
                  : 'bg-white dark:bg-slate-900 border-primary/45 shadow-sm shadow-primary/5 dark:border-primary/30'
              }`}
            >
              <div className={`p-2 rounded-lg shrink-0 ${n.isRead ? 'bg-slate-100 text-[var(--color-text-secondary)]' : 'bg-[var(--color-primary-pink)]/10 text-[var(--color-primary-pink)]'}`}>
                <Bell className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${n.isRead ? 'text-slate-700 dark:text-slate-300' : 'font-semibold text-slate-900 dark:text-slate-100'}`}>
                  {n.title}
                </p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                  {n.message}
                </p>
                <p className="text-[10px] text-slate-400 mt-2">
                  {dayjs(n.createdAt).format('MMM DD, YYYY [at] hh:mm A')}
                </p>
              </div>
              {!n.isRead && (
                <span className="w-2.5 h-2.5 bg-primary rounded-full shrink-0 mt-1.5" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
