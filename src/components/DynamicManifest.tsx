'use client';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function DynamicManifest() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  useEffect(() => {
    const manifestUrl = isAdmin ? '/manifest-admin.json' : '/manifest.json';
    let link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    if (link) {
      link.href = manifestUrl;
    } else {
      link = document.createElement('link');
      link.rel = 'manifest';
      link.href = manifestUrl;
      document.head.appendChild(link);
    }
  }, [isAdmin]);

  return null;
}
