'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

/* Brand mark — the source PNG is white-on-transparent, so we invert it
 * to ink via CSS filter to make it visible on the white sidebar. */
function BrandMark() {
  return (
    <img
      src="/uaeconnect-logo-cropped.png"
      alt="UAEConnect"
      className="w-10 h-10 object-contain shrink-0"
      style={{ filter: 'brightness(0)' }}
    />
  );
}

const ICON: Record<string, string> = {
  cores:      'M3 12 L21 12 M3 7 L21 7 M3 17 L21 17',
  registry:   'M4 5 H20 V19 H4 Z M4 9 H20 M9 19 V9',
  monitoring: 'M3 17 L8 12 L12 15 L17 8 L21 12',
  registerApp:'M12 5 V19 M5 12 H19',
  myApps:     'M4 6 H20 V14 H4 Z M4 18 H14',
  playground: 'M5 19 L19 5 M5 5 L9 9 M15 15 L19 19',
  queue:      'M4 7 H20 M4 12 H20 M4 17 H14',
  audit:      'M5 4 H19 V20 L12 16 L5 20 Z',
};

interface NavItemProps {
  href: string;
  label: string;
  icon: string;
  active: boolean;
  badge?: string;
}

function NavItem({ href, label, icon, active, badge }: NavItemProps) {
  return (
    <Link
      href={href}
      className={`
        group flex items-center justify-between gap-3 px-3 py-2.5 rounded-pill text-[14px] transition-all
        ${active
          ? 'bg-ink text-ink-on-dark'
          : 'text-ink-2 hover:text-ink hover:bg-card-soft'}
      `}
    >
      <span className="flex items-center gap-3 min-w-0">
        <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d={icon} />
        </svg>
        <span className="truncate">{label}</span>
      </span>
      {badge && (
        <span
          className={`text-[10px] font-mono px-2 py-0.5 rounded-pill ${active ? 'bg-white/15 text-ink-on-dark' : 'bg-card-soft text-ink-3'}`}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.roles?.includes('admin');

  const [opOpen,   setOpOpen]   = useState(true);
  const [devOpen,  setDevOpen]  = useState(true);

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/');

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-ink/40 z-40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-3 bottom-3 left-3 z-50 w-72 transition-transform duration-300
          ${isOpen ? 'translate-x-0' : '-translate-x-[110%] lg:translate-x-0'}
        `}
      >
        <div className="card-lg h-full flex flex-col overflow-hidden">
          {/* Brand */}
          <Link href="/" className="px-5 pt-5 pb-4 flex items-center gap-3">
            <BrandMark />
            <div className="leading-tight">
              <p className="font-display text-[18px] tracking-[-0.02em] text-ink" style={{ fontWeight: 800 }}>
                UAEConnect
              </p>
              <p className="eyebrow text-[9px]" style={{ letterSpacing: '0.14em' }}>
                {isAdmin ? 'Operator' : 'Developer'}
              </p>
            </div>
          </Link>

          <div className="mx-5 my-2 h-px bg-hairline" />

          <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
            {isAdmin && (
              <div className="space-y-1">
                <p className="eyebrow px-3 pb-1">Network</p>
                <NavItem href="/cores"      label="5G Cores"         icon={ICON.cores}      active={isActive('/cores')} />
                <NavItem href="/capif"      label="Service Registry" icon={ICON.registry}   active={isActive('/capif')} />
                <NavItem href="/monitoring" label="Monitoring"       icon={ICON.monitoring} active={isActive('/monitoring')} />
              </div>
            )}

            {!isAdmin && (
              <div>
                <button
                  onClick={() => setDevOpen(o => !o)}
                  className="w-full eyebrow px-3 pb-1 flex items-center justify-between hover:text-ink transition-colors"
                >
                  <span>Developer</span>
                  <span className={`transition-transform ${devOpen ? '' : '-rotate-90'}`}>▾</span>
                </button>
                {devOpen && (
                  <div className="space-y-1 mt-1">
                    <NavItem href="/developer/register"   label="Register App"     icon={ICON.registerApp} active={isActive('/developer/register')} />
                    <NavItem href="/developer/status"     label="My Registrations" icon={ICON.myApps}      active={isActive('/developer/status')} />
                    <NavItem href="/developer/playground" label="API Playground"   icon={ICON.playground}  active={isActive('/developer/playground')} />
                  </div>
                )}
              </div>
            )}

            {isAdmin && (
              <div>
                <button
                  onClick={() => setOpOpen(o => !o)}
                  className="w-full eyebrow px-3 pb-1 flex items-center justify-between hover:text-ink transition-colors"
                >
                  <span>Operator</span>
                  <span className={`transition-transform ${opOpen ? '' : '-rotate-90'}`}>▾</span>
                </button>
                {opOpen && (
                  <div className="space-y-1 mt-1">
                    <NavItem href="/admin/invokers" label="Approval Queue" icon={ICON.queue} active={isActive('/admin/invokers')} />
                    <NavItem href="/admin/audit"    label="Audit Log"      icon={ICON.audit} active={isActive('/admin/audit')} />
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-hairline flex items-center justify-between">
            <p className="font-mono text-[10px] text-ink-3 tracking-tight">v3.0</p>
            <span className="flex items-center gap-1.5 text-[10px] text-ink-3 font-mono uppercase tracking-[0.14em]">
              <span className="block w-1.5 h-1.5 rounded-full bg-moss pulse-dot" />
              live
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
