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
    <div className="min-h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header with mobile menu button */}
        <div className="sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-3 gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="flex-1">
              {isAdmin ? (
                <Header />
              ) : (
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">CAMARA Developer Portal</h1>
                  <p className="text-xs text-gray-500">Register apps and obtain access to CAMARA APIs</p>
                </div>
              )}
            </div>
            <UserMenu />
          </div>
        </div>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
