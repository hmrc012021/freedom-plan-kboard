import { NavLink } from 'react-router-dom';
import { Menu, Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabaseClient';
import { defaultEasternDate } from '@/lib/format';

export const NAV_ITEMS = [
  { to: '/', label: "Today / Matchups" },
  { to: '/predictability', label: 'Predictability' },
  { to: '/simulate', label: 'Simulation / Post-Mortem' },
  { to: '/roster', label: 'Lineup Lab' },
];

export function TopNav({ onMobileMenuToggle }: { onMobileMenuToggle: () => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1600px] items-center gap-4 px-5 py-3 lg:px-8">
        <button
          className="rounded-md p-1.5 text-text hover:bg-bg-elevated-2 lg:hidden"
          onClick={onMobileMenuToggle}
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        <div className="flex shrink-0 items-center gap-2 font-display text-base font-bold text-text">
          <span className="rounded bg-k px-2 py-0.5 text-bg">K</span>Board
        </div>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'whitespace-nowrap rounded-full px-3.5 py-1.5 font-display text-xs font-semibold uppercase tracking-wide transition-colors',
                  isActive ? 'bg-k text-bg' : 'text-text-muted hover:bg-bg-elevated-2 hover:text-text'
                )
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <span className="hidden font-mono-num text-xs text-text-muted sm:inline">{defaultEasternDate()} ET</span>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn('rounded-md p-1.5 hover:bg-bg-elevated-2', isActive ? 'text-k' : 'text-text-muted hover:text-text')
            }
            aria-label="Settings"
          >
            <Settings size={18} />
          </NavLink>
          <button
            onClick={() => supabase.auth.signOut()}
            className="rounded-md p-1.5 text-text-muted hover:bg-bg-elevated-2 hover:text-text"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
