'use client';
import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || ('standalone' in window.navigator && (window.navigator as unknown as { standalone: boolean }).standalone);
    if (isStandalone) return;

    // Check if dismissed recently
    const dismissed = localStorage.getItem('pwa-dismissed');
    if (dismissed && Date.now() - parseInt(dismissed) < 3 * 24 * 60 * 60 * 1000) return;

    // iOS detection
    const ua = window.navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIOS(isiOS);

    if (isiOS) {
      setTimeout(() => setShowBanner(true), 2000);
      return;
    }

    // Android/Chrome install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowBanner(true), 2000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIOSGuide(false);
    localStorage.setItem('pwa-dismissed', Date.now().toString());
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Install Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-[9998] p-4 animate-slide-up" style={{ animationDuration: '0.3s' }}>
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-[0_-4px_30px_rgba(0,0,0,0.12)] border border-surface-100 overflow-hidden">
          {showIOSGuide ? (
            // iOS Guide
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-surface-800 text-[15px]">Install on iPhone</h3>
                <button onClick={handleDismiss} className="p-1.5 rounded-lg hover:bg-surface-100 cursor-pointer">
                  <X className="w-4 h-4 text-surface-400" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-brand-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-brand-600 font-bold text-xs">1</span>
                  </div>
                  <p className="text-sm text-surface-600">
                    Tap the <span className="font-semibold">Share</span> button
                    <span className="inline-block ml-1 text-brand-600">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline -mt-0.5">
                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" />
                      </svg>
                    </span>
                    {' '}at the bottom of Safari
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-brand-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-brand-600 font-bold text-xs">2</span>
                  </div>
                  <p className="text-sm text-surface-600">
                    Scroll down and tap <span className="font-semibold">&quot;Add to Home Screen&quot;</span>
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-brand-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-brand-600 font-bold text-xs">3</span>
                  </div>
                  <p className="text-sm text-surface-600">
                    Tap <span className="font-semibold">&quot;Add&quot;</span> to install
                  </p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="w-full mt-4 py-2.5 rounded-xl bg-surface-100 text-surface-600 text-sm font-medium cursor-pointer hover:bg-surface-200 transition-colors"
              >
                Got it
              </button>
            </div>
          ) : (
            // Install prompt
            <div className="p-4 flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                <img src="/icon-192.png" alt="App" className="w-9 h-9 rounded-lg" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-surface-800 text-[14px]">Install ReBalance App</h3>
                <p className="text-xs text-surface-400 mt-0.5">Quick access from your home screen</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={handleDismiss}
                  className="p-2 rounded-lg hover:bg-surface-100 cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4 text-surface-400" />
                </button>
                <button
                  onClick={handleInstall}
                  className="px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold cursor-pointer hover:bg-brand-700 active:scale-[0.97] transition-all flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Install
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
