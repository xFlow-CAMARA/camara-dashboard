'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

/* Small inline SVG icons — distinctive, hand-drawn feel; not generic Heroicons.
 * 1.4 stroke, rounded caps. Slight wobble baked in. */
function Icon({ d, className }: { d: string; className?: string }) {
  return (
    <svg className={className ?? 'w-[18px] h-[18px]'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const PATH = {
  home:        'M4 11l8-7 8 7M6 10v9a1 1 0 001 1h3v-6h4v6h3a1 1 0 001-1v-9',
  apis:        'M4 6h16M4 12h16M4 18h10',
  registry:    'M3 7l9-4 9 4-9 4-9-4z M3 12l9 4 9-4 M3 17l9 4 9-4',
  monitor:     'M4 19V5m4 14V9m4 10V12m4 7V7m4 12v-4',
  registerApp: 'M12 5v14m-7-7h14',
  myApps:      'M4 6h16v4H4zM4 14h16v4H4z',
  playground: 'M5 4l8 8-8 8M14 4l8 8-8 8',
  queue:       'M3 6h18M3 12h18M3 18h12',
  audit:       'M9 5l6 0M9 12l6 0M9 19l6 0M5 5l0 0M5 12l0 0M5 19l0 0',
};

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const roles = session?.user?.roles ?? [];
  const isAdmin = roles.includes('admin');

  const [developerOpen, setDeveloperOpen] = useState(true);
  const [adminOpen, setAdminOpen]         = useState(true);

  const isActive = (p: string) => pathname === p;

  const navItem = (href: string, label: string, iconPath: string) => (
    <Link
      href={href}
      onClick={onClose}
      className={`group flex items-center gap-3 px-3 py-2 rounded-sm text-[13.5px] transition-colors
        ${isActive(href)
          ? 'bg-sage-50 text-sage-900 font-medium'
          : 'text-ink-2 hover:bg-bg-sunken hover:text-ink'
        }`}
    >
      <Icon d={iconPath} className="w-[17px] h-[17px] opacity-80" />
      <span>{label}</span>
      {isActive(href) && <span className="ml-auto w-1 h-1 rounded-full bg-sage-500" />}
    </Link>
  );

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-ink/30 z-40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed top-0 left-0 h-full z-50 w-72 transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        bg-bg-sunken border-r border-hairline
      `}>
        <div className="flex flex-col h-full">
          {/* Brand mark — distinctive serif lockup, not a logo */}
          <Link href="/" className="block px-6 pt-8 pb-6 border-b border-hairline">
            <h1 className="font-display text-[28px] leading-none tracking-[-0.02em] text-ink">
              CAMARA
              <span className="text-sage-500">.</span>
            </h1>
            <p className="text-[11px] uppercase tracking-[0.22em] text-ink-3 mt-2">
              {isAdmin ? 'Operator console' : 'Developer portal'}
            </p>
          </Link>

          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
            {isAdmin && (
              <div className="space-y-1">
                {navItem('/cores',      '5G Cores',         PATH.home)}
                {navItem('/capif',      'Service Registry', PATH.registry)}
                {navItem('/monitoring', 'Monitoring',       PATH.monitor)}
              </div>
            )}

            {/* Developer portal — visible only to non-admins */}
            {!isAdmin && (
              <div>
                <button
                  onClick={() => setDeveloperOpen(o => !o)}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] text-ink-3 hover:text-ink"
                >
                  <span>Developer Portal</span>
                  <span className={`text-ink-3 transition-transform ${developerOpen ? '' : '-rotate-90'}`}>▾</span>
                </button>
                {developerOpen && (
                  <div className="mt-1 space-y-0.5">
                    {navItem('/developer/register',   'Register App',     PATH.registerApp)}
                    {navItem('/developer/status',     'My Registrations', PATH.myApps)}
                    {navItem('/developer/playground', 'API Playground',   PATH.playground)}
                  </div>
                )}
              </div>
            )}

            {/* Admin */}
            {isAdmin && (
              <div>
                <button
                  onClick={() => setAdminOpen(o => !o)}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] text-ink-3 hover:text-ink"
                >
                  <span>Operator</span>
                  <span className={`text-ink-3 transition-transform ${adminOpen ? '' : '-rotate-90'}`}>▾</span>
                </button>
                {adminOpen && (
                  <div className="mt-1 space-y-0.5">
                    {navItem('/admin/invokers', 'Approval Queue', PATH.queue)}
                    {navItem('/admin/audit',    'Audit Log',      PATH.audit)}
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* Footer mark — tiny grain texture detail */}
          <div className="px-6 py-4 border-t border-hairline">
            <p className="font-mono text-[10px] text-ink-3 tracking-tight">
              v2.0 · 5G Network APIs
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
