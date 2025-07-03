'use client';

import React, { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Layout from './Layout';

interface RootLayoutContentProps {
  children: ReactNode;
}

// Routes that should not show the sidebar/layout
const NO_SIDEBAR_ROUTES = ['/login', '/register'];

export default function RootLayoutContent({ children }: RootLayoutContentProps) {
  const pathname = usePathname();
  
  // Check if current route should show sidebar
  const shouldShowLayout = !NO_SIDEBAR_ROUTES.includes(pathname);
  
  if (shouldShowLayout) {
    return <Layout>{children}</Layout>;
  }
  
  // For login/register pages, render without layout
  return <>{children}</>;
}