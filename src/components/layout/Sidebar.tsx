import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, CalendarSearch, Gauge, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabaseClient';

const NAV_ITEMS = [
  { to: '/', label: "Today's Board", icon: LayoutDashboard },
  { to: '/roster', label: 'Team Roster', icon: Users },
  { to: '/simulate', label: 'Simulate / Day Slate', icon: CalendarSearch },
  { to: '/predictability', label: 'Predictability', icon: Gauge },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-2 font-display text-lg font-bold text-text">
          <span className="rounded bg-k px-2 py-0.5 text-bg">K</span>Board
        </div>
        <div className="mt-1 font-mono-num text-[10px] uppercase tracking-wider text-text-muted">v21</div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors',
                isActive ? 'bg-k text-bg' : 'text-text-muted hover:bg-bg-elevated-2 hover:text-text'
              )
            }
          >
            <Icon size={16} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-5 pt-3">
        <button
          onClick={() => supabase.auth.signOut()}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-medium text-text-muted transition-colors hover:bg-bg-elevated-2 hover:text-text"
        >
          <LogOut size={16} strokeWidth={2} />
          Sign out
        </button>
      </div>
    </div>
  );
}
