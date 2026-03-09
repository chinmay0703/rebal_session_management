'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Package,
  Users,
  UserPlus,
  ClipboardList,
  MessageSquareText,
  Menu,
  X,
  Bell,
  CheckCheck,
  LogOut,
  Zap,
  Trash2,
  BellRing,
} from 'lucide-react';

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/quick-session', label: 'Quick Session', icon: Zap },
  { href: '/admin/packages', label: 'Packages', icon: Package },
  { href: '/admin/add-patient', label: 'Add Patient', icon: UserPlus },
  { href: '/admin/patients', label: 'Patients', icon: Users },
  { href: '/admin/sessions', label: 'Sessions', icon: ClipboardList },
  { href: '/admin/templates', label: 'Templates', icon: MessageSquareText },
];

const bottomNavItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/quick-session', label: 'Quick Session', icon: Zap },
  { href: '/admin/sessions', label: 'Sessions', icon: ClipboardList },
  { href: '/admin/patients', label: 'Patients', icon: Users },
];

interface NotificationItem {
  _id: string;
  type: string;
  patient_name: string;
  message: string;
  read: boolean;
  created_at: string;
}

export default function Sidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  // Check if push is already enabled
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setPushEnabled(!!sub);
    });
  }, []);

  const togglePush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    setPushLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      if (pushEnabled) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await fetch('/api/push', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
          await sub.unsubscribe();
        }
        setPushEnabled(false);
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          setPushLoading(false);
          return;
        }
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BKB-vTi_Jp1pna3ttcFBTetuhf-GVHX59TTepMtjZXg9S1I9PLdq4qyoPb4g7-MRVCE7XusZAET8Ou67OeRHKg0',
        });
        await fetch('/api/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sub.toJSON()),
        });
        setPushEnabled(true);
      }
    } catch { /* ignore */ }
    setPushLoading(false);
  };

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/count');
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    router.replace('/admin/login');
  };

  const openNotifications = async () => {
    setNotifOpen(true);
    setNotifLoading(true);
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch { /* ignore */ }
    setNotifLoading(false);
  };

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch { /* ignore */ }
  };

  const deleteAll = async () => {
    try {
      await fetch('/api/notifications', { method: 'DELETE' });
      setNotifications([]);
      setUnreadCount(0);
    } catch { /* ignore */ }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-surface-100 px-4 py-3 flex items-center justify-between">
        <img src="/logo.jpg" alt="Logo" className="h-9 w-auto rounded-xl object-contain" />
        <div className="flex items-center gap-2">
          <button onClick={openNotifications} className="p-2 rounded-lg hover:bg-surface-100 cursor-pointer relative">
            <Bell className="w-5 h-5 text-surface-500" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-accent-coral text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-lg hover:bg-surface-100 cursor-pointer">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
      )}

      {/* Notification Panel Overlay */}
      {notifOpen && (
        <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm" onClick={() => setNotifOpen(false)} />
      )}

      {/* Notification Panel */}
      <div className={cn(
        'fixed top-0 right-0 h-full w-full sm:w-[380px] bg-white z-[70] shadow-2xl transition-transform duration-300',
        notifOpen ? 'translate-x-0' : 'translate-x-full'
      )}>
        <div className="flex items-center justify-between p-4 border-b border-surface-100">
          <h2 className="text-lg font-semibold text-surface-800">Notifications</h2>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 px-2 py-1 rounded-lg hover:bg-brand-50 cursor-pointer">
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button onClick={deleteAll} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 cursor-pointer">
                <Trash2 className="w-3.5 h-3.5" />
                Delete all
              </button>
            )}
            <button onClick={() => setNotifOpen(false)} className="p-1.5 rounded-lg hover:bg-surface-100 cursor-pointer">
              <X className="w-5 h-5 text-surface-400" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto h-[calc(100%-60px)]">
          {notifLoading ? (
            <div className="p-8 text-center text-surface-400">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-surface-400">
              <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-surface-50">
              {notifications.map((n) => (
                <div key={n._id} className={cn(
                  'px-4 py-3 transition-colors',
                  !n.read && 'bg-brand-50/40'
                )}>
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'w-2 h-2 rounded-full mt-2 shrink-0',
                      n.type === 'last_3_sessions' ? 'bg-accent-amber' :
                      n.type === 'package_completed' ? 'bg-accent-coral' :
                      'bg-brand-500'
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-surface-700">{n.message}</p>
                      <p className="text-xs text-surface-400 mt-0.5">{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <aside className={cn(
        'fixed top-0 left-0 h-full w-[260px] bg-white border-r border-surface-100 z-50 transition-transform duration-300',
        'lg:translate-x-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="p-6 border-b border-surface-100">
          <div className="flex items-center justify-center">
            <img src="/logo.jpg" alt="Logo" className="h-12 w-auto rounded-xl object-contain" />
          </div>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-brand-50 text-brand-700 border-l-4 border-brand-600'
                    : 'text-surface-500 hover:bg-surface-50 hover:text-surface-700'
                )}
              >
                <Icon className={cn('w-5 h-5', isActive ? 'text-brand-600' : 'text-surface-400')} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-surface-100 space-y-1">
          <button onClick={openNotifications} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-surface-500 hover:bg-surface-50 hover:text-surface-700 transition-all duration-200 w-full cursor-pointer">
            <div className="relative">
              <Bell className="w-5 h-5 text-surface-400" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-accent-coral text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            Notifications
            {unreadCount > 0 && (
              <span className="ml-auto bg-accent-coral/10 text-accent-coral text-xs font-semibold px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
          <button onClick={togglePush} disabled={pushLoading} className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 w-full cursor-pointer',
            pushEnabled ? 'text-brand-600 bg-brand-50 hover:bg-brand-100' : 'text-surface-500 hover:bg-surface-50 hover:text-surface-700'
          )}>
            <BellRing className={cn('w-5 h-5', pushEnabled ? 'text-brand-600' : 'text-surface-400')} />
            {pushLoading ? 'Loading...' : pushEnabled ? 'Push On' : 'Enable Push'}
          </button>
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-surface-500 hover:bg-red-50 hover:text-red-600 transition-all duration-200 w-full cursor-pointer">
            <LogOut className="w-5 h-5 text-surface-400" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-surface-100">
        <div className="flex items-center justify-around py-2">
          {bottomNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                className={cn('flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-xs', isActive ? 'text-brand-600' : 'text-surface-400')}>
                <Icon className="w-5 h-5" />
                <span>{item.label.split(' ').pop()}</span>
                {isActive && <div className="w-1 h-1 rounded-full bg-brand-600" />}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <main className="lg:ml-[260px] pt-16 lg:pt-0 pb-20 lg:pb-0 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
