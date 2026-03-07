import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'Session Manager - Clinic Portal',
  description: 'Clinic patient session tracking system',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Toaster position="top-right" toastOptions={{
          style: { borderRadius: '12px', background: '#1f2937', color: '#fff', fontSize: '14px' },
        }} />
        {children}
      </body>
    </html>
  );
}
