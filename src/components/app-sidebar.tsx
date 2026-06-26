import { Link, useRouterState } from '@tanstack/react-router'
import {
  BarChart3,
  BookOpen,
  Briefcase,
  Calendar,
  ChevronDown,
  CreditCard,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Users,
  UserSquare2,
} from 'lucide-react'
import { useState } from 'react'
import { useUser } from '@/contexts/user'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  icon: React.ElementType
  to: string
  children?: { label: string; to: string }[]
}

const mainNavItems: NavItem[] = [
  { label: 'Meu Painel', icon: LayoutDashboard, to: '/dashboard' },
  { label: 'Leads', icon: Users, to: '/leads' },
  { label: 'Clientes', icon: UserSquare2, to: '/clients' },
  { label: 'Casos', icon: Briefcase, to: '/cases' },
  { label: 'Agenda', icon: Calendar, to: '/agenda' },
  {
    label: 'Financeiro',
    icon: CreditCard,
    to: '/financial',
    children: [
      { label: 'Honorários', to: '/financial/fees' },
      { label: 'Contratos', to: '/financial/contracts' },
      { label: 'Pagamentos', to: '/financial/payments' },
    ],
  },
  { label: 'Relatórios', icon: BarChart3, to: '/reports' },
]

const systemNavItems: NavItem[] = [
  { label: 'Documentos', icon: BookOpen, to: '/documents' },
  { label: 'Configurações', icon: Settings, to: '/settings' },
]

const adminNavItems: NavItem[] = [
  { label: 'Controle de Perfis', icon: ShieldCheck, to: '/users' },
]

function NavLink({
  item,
  onNavigate,
}: {
  item: NavItem
  onNavigate?: () => void
}) {
  const { location } = useRouterState()
  const isActive =
    location.pathname === item.to ||
    (item.children?.some((c) => location.pathname.startsWith(c.to)) ?? false)

  const [open, setOpen] = useState(!!isActive)
  const Icon = item.icon

  if (item.children) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
            isActive
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          )}
        >
          <Icon className="size-4 shrink-0" />
          <span className="flex-1 text-left">{item.label}</span>
          <ChevronDown
            className={cn(
              'size-3.5 transition-transform text-sidebar-foreground/40',
              open && 'rotate-180'
            )}
          />
        </button>
        {open && (
          <div className="mt-0.5 ml-4 space-y-0.5 border-l border-sidebar-border pl-3">
            {item.children.map((child) => (
              <Link
                key={child.to}
                to={child.to}
                onClick={onNavigate}
                className={cn(
                  'flex items-center rounded-md px-3 py-1.5 text-sm transition-colors',
                  location.pathname === child.to
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                    : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                )}
              >
                {child.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
        isActive
          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
      )}
    >
      <Icon className="size-4 shrink-0" />
      {item.label}
    </Link>
  )
}

interface AppSidebarProps {
  open: boolean
  onClose: () => void
}

export function AppSidebar({ open, onClose }: AppSidebarProps) {
  const { userInfo } = useUser()
  const isAdmin = userInfo?.role === 'ADMIN'

  const filteredMainNav = mainNavItems.filter((item) => {
    if (userInfo?.role === 'CLIENT' || userInfo?.role === 'LAWYER') {
      // clients and leads are not available for CLIENT or LAWYER users
      return item.to !== '/leads' && item.to !== '/clients'
    }
    return true
  })

  return (
    <aside
      className={cn(
        'fixed bottom-0 left-0 top-14 z-30 w-60 shrink-0 flex flex-col border-r border-sidebar-border bg-sidebar',
        'transition-transform duration-200 ease-in-out',
        'lg:static lg:top-auto lg:bottom-auto lg:h-full lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
          Principal
        </p>
        {filteredMainNav.map((item) => (
          <NavLink key={item.to} item={item} onNavigate={onClose} />
        ))}

        <div className="pt-3">
          <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
            Sistema
          </p>
          {systemNavItems.map((item) => (
            <NavLink key={item.to} item={item} onNavigate={onClose} />
          ))}
        </div>

        {isAdmin && (
          <div className="pt-3">
            <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
              Administração
            </p>
            {adminNavItems.map((item) => (
              <NavLink key={item.to} item={item} onNavigate={onClose} />
            ))}
          </div>
        )}
      </nav>

    </aside>
  )
}
