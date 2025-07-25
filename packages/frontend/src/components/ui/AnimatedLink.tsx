'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

interface AnimatedLinkProps {
  href: string;
  children: ReactNode;
  icon?: ReactNode;
  variant?: 'card' | 'inline' | 'nav';
  className?: string;
}

export function AnimatedLink({ href, children, icon, variant = 'inline', className }: AnimatedLinkProps) {
  const baseStyles = {
    card: 'block p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all',
    inline: 'inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 transition-colors',
    nav: 'flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 transition-all'
  };

  const content = (
    <>
      {icon && (
        <motion.span
          className="flex-shrink-0"
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          {icon}
        </motion.span>
      )}
      <span>{children}</span>
    </>
  );

  if (variant === 'card') {
    return (
      <Link href={href} className={twMerge(baseStyles[variant], className)}>
        <motion.div
          whileHover={{ y: -4 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          {content}
        </motion.div>
      </Link>
    );
  }

  return (
    <motion.div whileHover={{ x: 2 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
      <Link href={href} className={twMerge(baseStyles[variant], className)}>
        {content}
      </Link>
    </motion.div>
  );
}