// packages/frontend/src/app/layout.tsx
// Root layout component for Next.js 14 app directory

import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth/AuthProvider';
import { QueryProvider } from '@/lib/QueryProvider';

export const metadata: Metadata = {
  title: 'Yggdrasil Educational Platform',
  description: 'Modern IT school management platform',
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">
        <QueryProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}