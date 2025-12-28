import { Bell, Search, User } from 'lucide-react'
import { HelpButton } from '../ui'

interface HeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  helpContent?: React.ReactNode
}

export function Header({ title, description, actions, helpContent }: HeaderProps) {
  return (
    <header className="h-16 bg-zinc-900 border-b border-zinc-800 flex items-center px-6 relative">
      <div>
        <h1 className="text-xl font-semibold text-white">{title}</h1>
        {description && (
          <p className="text-sm text-zinc-500 mt-0.5">{description}</p>
        )}
      </div>

      {/* Help Button - Centered with offset */}
      {helpContent && (
        <div className="absolute left-1/2 transform -translate-x-1/2" style={{ marginLeft: '-40px' }}>
          <HelpButton title={title} content={helpContent} />
        </div>
      )}

      <div className="flex items-center gap-4 ml-auto">
        {actions}

        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar..."
            aria-label="Buscar en el sistema"
            className="w-64 pl-9 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        {/* Notifications */}
        <button
          className="relative p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          aria-label="Notificaciones (1 nueva)"
        >
          <Bell className="w-5 h-5" aria-hidden="true" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full" aria-hidden="true" />
        </button>

        {/* User Menu */}
        <button
          className="flex items-center gap-2 p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
          aria-label="Menú de usuario: Admin"
        >
          <div className="w-8 h-8 bg-zinc-700 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-zinc-400" aria-hidden="true" />
          </div>
          <span className="text-sm font-medium text-zinc-300 hidden md:block">
            Admin
          </span>
        </button>
      </div>
    </header>
  )
}
