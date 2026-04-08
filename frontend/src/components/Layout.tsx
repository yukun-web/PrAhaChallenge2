import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { to: '/participants', label: '参加者管理' },
  { to: '/teams', label: 'チーム・ペア' },
  { to: '/tasks', label: '課題検索' },
]

export function Layout() {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-56 border-r bg-muted/40 p-4 flex flex-col gap-1">
        <h1 className="text-lg font-bold mb-6 px-3">Praha Admin</h1>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
