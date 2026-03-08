'use client';
import React, { useState } from 'react';
import Link from 'next/link';

import { usePathname } from 'next/navigation';
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
} from 'lucide-react';

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/packages', label: 'Packages', icon: Package },
  { href: '/admin/add-patient', label: 'Add Patient', icon: UserPlus },
  { href: '/admin/patients', label: 'Patients', icon: Users },
  { href: '/admin/sessions', label: 'Sessions', icon: ClipboardList },
  { href: '/admin/templates', label: 'Templates', icon: MessageSquareText },
];

const bottomNavItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/sessions', label: 'Sessions', icon: ClipboardList },
  { href: '/admin/add-patient', label: 'Add Patient', icon: UserPlus },
  { href: '/admin/patients', label: 'Patients', icon: Users },
];

export default function Sidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-surface-100 px-4 py-3 flex items-center justify-between">
        <img src="/logo.jpg" alt="Logo" className="h-9 w-auto rounded-xl object-contain" />
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-lg hover:bg-surface-100 cursor-pointer">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
      )}

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
