import { Outlet, NavLink } from 'react-router-dom'
import { ClipboardCheck, GitBranch, LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', label: 'Pending Approvals', icon: ClipboardCheck },
  { to: '/workflows', label: 'Workflows', icon: GitBranch },
]

export function AppLayout() {
  const { user, logout } = useAuth()

  return (
    <div className="flex h-screen">
      <aside className="flex w-64 flex-col border-r bg-sidebar-background text-sidebar-foreground">
        <div className="border-b p-4">
          <h1 className="text-lg font-semibold">Workflow Manager</h1>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t p-4">
          <div className="mb-3 space-y-1">
            <p className="text-sm font-medium">{user?.displayName}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
            <div className="flex gap-1 pt-1">
              {user?.roles
                .filter((r) => ['pm', 'ba', 'admin'].includes(r))
                .map((role) => (
                  <Badge key={role} variant="secondary" className="text-[10px] uppercase">
                    {role}
                  </Badge>
                ))}
            </div>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
