'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if running as installed PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || ('standalone' in window.navigator && (window.navigator as unknown as { standalone: boolean }).standalone);

    if (isStandalone) {
      // Check which app was installed by looking at stored preference
      const appType = localStorage.getItem('pwa-type');
      if (appType === 'checkin') {
        router.replace('/checkin');
      } else if (appType === 'admin') {
        router.replace('/admin/dashboard');
      } else {
        // No preference stored — default to checkin for standalone
        router.replace('/checkin');
      }
    } else {
      // Normal browser — go to admin
      router.replace('/admin/dashboard');
    }
  }, [router]);

  return null;
}
