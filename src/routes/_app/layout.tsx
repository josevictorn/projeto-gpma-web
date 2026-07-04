import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { AppHeader } from '@/components/app-header'
import { AppSidebar } from '@/components/app-sidebar'

export const Route = createFileRoute('/_app')({
  component: AppLayout,
  beforeLoad: ({ context, location }) => {
    const isAuthenticated = context?.isAuthenticated

    if (!isAuthenticated) {
      throw redirect({
        to: '/sign-in',
        search: {
          redirect: location.href,
        },
      })
    }
  },
})

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <AppHeader onMenuClick={() => setSidebarOpen((v) => !v)} />

      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && (
          <div
            className="fixed inset-x-0 bottom-0 top-14 z-20 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>

          <footer className="shrink-0 border-t border-border px-6 py-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>© 2026 vero.app — Sistema de Gestão de Escritório de Advocacia</span>
            <span className="hidden sm:block">GPMA · UFRN</span>
          </footer>
        </div>
      </div>
    </div>
  )
}
