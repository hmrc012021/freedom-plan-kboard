import { useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TopNav, NAV_ITEMS } from './TopNav';

export function AppShell({ children, title }: { children: ReactNode; title: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bg">
      <TopNav onMobileMenuToggle={() => setMobileOpen(true)} />

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-bg shadow-xl">
            <button
              className="absolute right-3 top-4 rounded-md p-1.5 text-text-muted hover:bg-bg-elevated-2"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
            <nav className="flex flex-col gap-0.5 px-3 pt-16">
              {NAV_ITEMS.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors',
                      isActive ? 'bg-k text-bg' : 'text-text-muted hover:bg-bg-elevated-2 hover:text-text'
                    )
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-[1600px] px-5 py-6 lg:px-8 lg:py-8">
        <h1 className="mb-5 font-display text-lg font-semibold tracking-tight text-text">{title}</h1>
        {children}
      </main>
    </div>
  );
}
