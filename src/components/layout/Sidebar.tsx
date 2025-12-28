import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  GitBranch,
  FolderTree,
  Layers,
  Package,
  DollarSign,
  AlertTriangle,
  Tags,
  Percent,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  List,
  LayoutGrid,
  Users,
  UtensilsCrossed,
  Megaphone,
  ShoppingCart,
  BarChart3,
  TrendingUp,
  History,
  Award,
  Shield,
} from 'lucide-react'
import { useBranchStore, selectSelectedBranchId, selectBranchById } from '../../stores/branchStore'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

interface NavSubGroup {
  name: string
  icon: React.ComponentType<{ className?: string }>
  children: NavItem[]
}

interface NavGroup {
  name: string
  icon: React.ComponentType<{ className?: string }>
  children: (NavItem | NavSubGroup)[]
}

type NavigationItem = NavItem | NavGroup

function isNavGroup(item: NavigationItem): item is NavGroup {
  return 'children' in item && !('href' in item)
}

function isNavSubGroup(item: NavItem | NavSubGroup): item is NavSubGroup {
  return 'children' in item && !('href' in item)
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Restaurante', href: '/restaurant', icon: Building2 },
  {
    name: 'Gestion',
    icon: ClipboardList,
    children: [
      {
        name: 'Sucursales',
        icon: GitBranch,
        children: [
          { name: 'Todas', href: '/branches', icon: List },
          { name: 'Mesas', href: '/branches/tables', icon: LayoutGrid },
          { name: 'Personal', href: '/branches/staff', icon: Users },
          { name: 'Pedidos', href: '/branches/orders', icon: ShoppingCart },
        ],
      },
      {
        name: 'Productos',
        icon: Package,
        children: [
          { name: 'Categorias', href: '/categories', icon: FolderTree },
          { name: 'Subcategorias', href: '/subcategories', icon: Layers },
          { name: 'Platos', href: '/products', icon: UtensilsCrossed },
          { name: 'Alergenos', href: '/allergens', icon: AlertTriangle },
          { name: 'Insignia', href: '/badges', icon: Award },
          { name: 'Sellos', href: '/seals', icon: Shield },
        ],
      },
    ],
  },
  {
    name: 'Marketing',
    icon: Megaphone,
    children: [
      { name: 'Precios', href: '/prices', icon: DollarSign },
      { name: 'Tipos de Promo', href: '/promotion-types', icon: Tags },
      { name: 'Promociones', href: '/promotions', icon: Percent },
    ],
  },
  {
    name: 'Estadisticas',
    icon: BarChart3,
    children: [
      { name: 'Ventas', href: '/statistics/sales', icon: TrendingUp },
      {
        name: 'Historial',
        icon: History,
        children: [
          { name: 'Sucursales', href: '/statistics/history/branches', icon: GitBranch },
          { name: 'Clientes', href: '/statistics/history/customers', icon: Users },
        ],
      },
    ],
  },
]

const bottomNavigation = [
  { name: 'Configuracion', href: '/settings', icon: Settings },
]

// Memoized map of group names to their paths (computed once at module level)
const groupPathsMap = new Map<string, string[]>()

function getGroupPaths(items: (NavItem | NavSubGroup)[]): string[] {
  const paths: string[] = []
  for (const item of items) {
    if (isNavSubGroup(item)) {
      paths.push(...item.children.map((c) => c.href))
    } else {
      paths.push(item.href)
    }
  }
  return paths
}

// Pre-compute all group paths at module initialization
for (const item of navigation) {
  if (isNavGroup(item)) {
    groupPathsMap.set(item.name, getGroupPaths(item.children))
    for (const child of item.children) {
      if (isNavSubGroup(child)) {
        groupPathsMap.set(child.name, child.children.map((c) => c.href))
      }
    }
  }
}

// Helper to check if a path is active
function isPathActive(pathname: string, targetPath: string): boolean {
  return pathname === targetPath || pathname.startsWith(targetPath + '/')
}

export function Sidebar() {
  const location = useLocation()
  const selectedBranchId = useBranchStore(selectSelectedBranchId)
  const selectedBranch = useBranchStore(selectBranchById(selectedBranchId))

  // Track open state for all groups dynamically
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}

    // Auto-open groups and subgroups if any child is active
    for (const item of navigation) {
      if (isNavGroup(item)) {
        const groupPaths = groupPathsMap.get(item.name) ?? []
        const isActive = groupPaths.some((path) => isPathActive(location.pathname, path))
        initial[item.name] = isActive

        // Check subgroups
        for (const child of item.children) {
          if (isNavSubGroup(child)) {
            const subPaths = groupPathsMap.get(child.name) ?? []
            const subIsActive = subPaths.some((path) => isPathActive(location.pathname, path))
            initial[child.name] = subIsActive
          }
        }
      }
    }

    return initial
  })

  const toggleGroup = (name: string) => {
    setOpenGroups((prev) => ({ ...prev, [name]: !prev[name] }))
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">B</span>
          </div>
          <span className="text-white font-semibold text-lg">Buen Sabor</span>
        </div>
      </div>

      {/* Selected Branch Indicator */}
      {selectedBranch && (
        <div className="px-4 py-3 border-b border-zinc-800 bg-orange-500/5">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">
            Sucursal activa
          </p>
          <p className="text-sm font-medium text-orange-500 truncate">
            {selectedBranch.name}
          </p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          if (isNavGroup(item)) {
            const isOpen = openGroups[item.name] ?? false
            const groupPaths = groupPathsMap.get(item.name) ?? []
            const hasActiveChild = groupPaths.some((path) => isPathActive(location.pathname, path))

            return (
              <div key={item.name}>
                <button
                  onClick={() => toggleGroup(item.name)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 ${
                    hasActiveChild
                      ? 'text-orange-500'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                  aria-expanded={isOpen}
                  aria-label={`${isOpen ? 'Contraer' : 'Expandir'} ${item.name}`}
                >
                  <item.icon className="w-5 h-5" aria-hidden="true" />
                  <span className="font-medium flex-1 text-left">{item.name}</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>
                {isOpen && (
                  <div className="mt-1 ml-4 pl-3 border-l border-zinc-800 space-y-1">
                    {item.children.map((child) => {
                      if (isNavSubGroup(child)) {
                        const subIsOpen = openGroups[child.name] ?? false
                        const subHasActiveChild = child.children.some((c) => isPathActive(location.pathname, c.href))

                        return (
                          <div key={child.name}>
                            <button
                              onClick={() => toggleGroup(child.name)}
                              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-150 ${
                                subHasActiveChild
                                  ? 'text-orange-500'
                                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                              }`}
                              aria-expanded={subIsOpen}
                              aria-label={`${subIsOpen ? 'Contraer' : 'Expandir'} ${child.name}`}
                            >
                              <child.icon className="w-4 h-4" aria-hidden="true" />
                              <span className="text-sm font-medium flex-1 text-left">{child.name}</span>
                              <ChevronRight
                                className={`w-3 h-3 transition-transform duration-200 ${
                                  subIsOpen ? 'rotate-90' : ''
                                }`}
                                aria-hidden="true"
                              />
                            </button>
                            {subIsOpen && (
                              <div className="mt-1 ml-4 pl-3 border-l border-zinc-700 space-y-1">
                                {child.children.map((subChild) => (
                                  <NavLink
                                    key={subChild.name}
                                    to={subChild.href}
                                    className={({ isActive }) =>
                                      `flex items-center gap-3 px-3 py-1.5 rounded-lg transition-colors duration-150 ${
                                        isActive
                                          ? 'bg-orange-500/10 text-orange-500'
                                          : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                                      }`
                                    }
                                  >
                                    <subChild.icon className="w-3.5 h-3.5" aria-hidden="true" />
                                    <span className="text-xs font-medium">{subChild.name}</span>
                                  </NavLink>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      }

                      return (
                        <NavLink
                          key={child.name}
                          to={child.href}
                          className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-150 ${
                              isActive
                                ? 'bg-orange-500/10 text-orange-500'
                                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                            }`
                          }
                        >
                          <child.icon className="w-4 h-4" aria-hidden="true" />
                          <span className="text-sm font-medium">{child.name}</span>
                        </NavLink>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 ${
                  isActive
                    ? 'bg-orange-500/10 text-orange-500'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`
              }
            >
              <item.icon className="w-5 h-5" aria-hidden="true" />
              <span className="font-medium">{item.name}</span>
            </NavLink>
          )
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="px-3 py-4 border-t border-zinc-800 space-y-1">
        {bottomNavigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 ${
                isActive
                  ? 'bg-orange-500/10 text-orange-500'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`
            }
          >
            <item.icon className="w-5 h-5" aria-hidden="true" />
            <span className="font-medium">{item.name}</span>
          </NavLink>
        ))}

        <button
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors duration-150"
          onClick={() => {
            // TODO: Implement logout functionality
          }}
          aria-label="Cerrar sesión"
        >
          <LogOut className="w-5 h-5" aria-hidden="true" />
          <span className="font-medium">Cerrar Sesion</span>
        </button>
      </div>
    </aside>
  )
}
