import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { PageContainer } from '../components/layout/PageContainer'
import { TrendingUp, DollarSign, ShoppingBag, Users } from 'lucide-react'
import { Card } from '../components/ui'
import { helpContent } from '../utils/helpContent'

export function SalesPage() {
  // REACT 19: Document metadata
  useDocumentTitle('Ventas')

  return (
    <PageContainer
      title="Ventas"
      description="Estadisticas de ventas por sucursal"
      helpContent={helpContent.sales}
    >
      {/* SPRINT 7: Sales stats skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-zinc-400">Ventas Totales</p>
            <DollarSign className="w-5 h-5 text-green-500" aria-hidden="true" />
          </div>
          <div className="animate-pulse space-y-2">
            <div className="h-8 bg-zinc-800 rounded w-32" />
            <div className="h-3 bg-zinc-700 rounded w-24" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-zinc-400">Pedidos</p>
            <ShoppingBag className="w-5 h-5 text-blue-500" aria-hidden="true" />
          </div>
          <div className="animate-pulse space-y-2">
            <div className="h-8 bg-zinc-800 rounded w-20" />
            <div className="h-3 bg-zinc-700 rounded w-24" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-zinc-400">Clientes</p>
            <Users className="w-5 h-5 text-purple-500" aria-hidden="true" />
          </div>
          <div className="animate-pulse space-y-2">
            <div className="h-8 bg-zinc-800 rounded w-16" />
            <div className="h-3 bg-zinc-700 rounded w-24" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-zinc-400">Ticket Promedio</p>
            <TrendingUp className="w-5 h-5 text-orange-500" aria-hidden="true" />
          </div>
          <div className="animate-pulse space-y-2">
            <div className="h-8 bg-zinc-800 rounded w-28" />
            <div className="h-3 bg-zinc-700 rounded w-24" />
          </div>
        </Card>
      </div>

      {/* SPRINT 7: Chart skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-zinc-800 rounded w-48" />
            <div className="h-64 bg-zinc-800/50 rounded" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-zinc-800 rounded w-48" />
            <div className="h-64 bg-zinc-800/50 rounded" />
          </div>
        </Card>
      </div>

      {/* SPRINT 7: Accessibility - Status announcement */}
      <div
        role="status"
        aria-live="polite"
        className="sr-only"
      >
        Cargando estadísticas de ventas...
      </div>

      <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
        <TrendingUp className="w-16 h-16 mb-4" aria-hidden="true" />
        <h2 className="text-xl font-semibold text-zinc-300 mb-2">
          Estadisticas de Ventas
        </h2>
        <p className="text-center max-w-md">
          Proximamente podras ver graficos y reportes de ventas por sucursal,
          productos mas vendidos y tendencias de consumo.
        </p>
      </div>
    </PageContainer>
  )
}

export default SalesPage
