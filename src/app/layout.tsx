import type { Metadata, Viewport } from 'next';
import { Toaster } from 'react-hot-toast';
import PWAInstall from '@/components/PWAInstall';
import SplashScreen from '@/components/SplashScreen';
import DynamicManifest from '@/components/DynamicManifest';
import './globals.css';

export const metadata: Metadata = {
  title: 'ReBalance Physiotherapy',
  description: 'Clinic session management and patient tracking',
  // manifest is set dynamically by DynamicManifest component
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ReBalance',
    startupImage: '/icon-512-any.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0274c3',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Toaster position="top-right" toastOptions={{
          style: { borderRadius: '12px', background: '#1f2937', color: '#fff', fontSize: '14px' },
        }} />
        <DynamicManifest />
        <SplashScreen />
        {children}
        <PWAInstall />
      </body>
    </html>
  );
}
