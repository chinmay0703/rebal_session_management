'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function SplashScreen() {
  const pathname = usePathname();
  const isCheckinPage = pathname === '/checkin' || pathname === '/';
  const [visible, setVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (!isCheckinPage) return;

    // Only show splash on first visit (not on every navigation)
    const hasShown = sessionStorage.getItem('splash-shown');
    if (hasShown) return;

    setVisible(true);
    sessionStorage.setItem('splash-shown', '1');

    const timer1 = setTimeout(() => setFadeOut(true), 1800);
    const timer2 = setTimeout(() => setVisible(false), 2300);
    return () => { clearTimeout(timer1); clearTimeout(timer2); };
  }, [isCheckinPage]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
      style={{ background: 'linear-gradient(160deg, #f0f7ff 0%, #ffffff 40%, #f0f7ff 100%)' }}
    >
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-brand-100/30 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-brand-200/20 blur-3xl" />
      </div>

      {/* Logo */}
      <div className="relative splash-logo-animate">
        <div className="w-24 h-24 rounded-3xl bg-white shadow-[0_8px_40px_rgba(2,116,195,0.15)] flex items-center justify-center p-3">
          <img
            src="/GoogleSearch.png"
            alt="ReBalance"
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {/* Text */}
      <div className="mt-6 text-center splash-text-animate">
        <h1 className="text-xl font-bold text-surface-900 tracking-tight">ReBalance</h1>
        <p className="text-[12px] text-surface-400 mt-1 font-medium">Physiotherapy Clinic</p>
      </div>

      {/* Loading indicator */}
      <div className="mt-10 splash-dots-animate">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-brand-400 splash-dot-1" />
          <div className="w-1.5 h-1.5 rounded-full bg-brand-400 splash-dot-2" />
          <div className="w-1.5 h-1.5 rounded-full bg-brand-400 splash-dot-3" />
        </div>
      </div>
    </div>
  );
}
