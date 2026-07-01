'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Sidebar from './Sidebar';
import UserMenu from './UserMenu';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: session } = useSession();
  const isAdmin = session?.user?.roles?.includes('admin');

  return (
    <div className="min-h-screen bg-bg">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-[312px]">
        {/* Top bar — floating pill (solid bg so scrolled content doesn't bleed through) */}
        <div className="sticky top-0 z-30 bg-bg px-3 pt-3 pb-1 lg:pr-3 lg:pl-0">
          <div className="card-lg px-5 py-3 flex items-center justify-between gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden btn-icon"
              aria-label="Open sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="hidden lg:flex items-center gap-2.5 text-[12px] text-ink-3">
              <span className="block w-1.5 h-1.5 rounded-full bg-moss pulse-dot" />
              <span className="font-mono uppercase tracking-[0.16em] text-[10px]">
                {isAdmin ? 'Operator Console' : 'Developer Portal'}
              </span>
            </div>

            <div className="flex-1" />

            <UserMenu />
          </div>
        </div>

        <main className="px-3 pt-3 pb-6 lg:pl-0 lg:pr-3 reveal">
          {children}
        </main>
      </div>
    </div>
  );
}
