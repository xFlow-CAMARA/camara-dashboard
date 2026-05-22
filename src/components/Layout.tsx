'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Sidebar from './Sidebar';
import Header from './Header';
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

      <div className="lg:pl-72">
        {/* Top bar — thin, hairline, breathing room */}
        <div className="sticky top-0 z-30 bg-bg/80 backdrop-blur-md border-b border-hairline">
          <div className="flex items-center justify-between gap-4 px-6 lg:px-10 py-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md text-ink-2 hover:bg-bg-sunken"
              aria-label="Open sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="flex-1 min-w-0">
              {isAdmin ? (
                <Header />
              ) : (
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-ink-3 font-medium">
                    CAMARA · Developer Portal
                  </p>
                </div>
              )}
            </div>
            <UserMenu />
          </div>
        </div>

        <main className="px-6 lg:px-10 py-8 lg:py-12 reveal">
          {children}
        </main>
      </div>
    </div>
  );
}
