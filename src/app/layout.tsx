// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/contexts/AuthContext';
import { CurriculumProvider } from '@/contexts/CurriculumContext';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '101 IT School',
  description: 'Learn Computer Science by doing',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-gray-900`}>
        <AuthProvider>
          <CurriculumProvider>
            {children}
          </CurriculumProvider>
        </AuthProvider>
      </body>
    </html>
  );
}