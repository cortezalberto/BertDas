import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { PageContainer } from '../components/layout'
import { Card, TableSkeleton } from '../components/ui'
import { Package, Clock, TrendingUp } from 'lucide-react'

export function OrdersPage() {
  // REACT 19: Document metadata
  useDocumentTitle('Pedidos')

  return (
    <PageContainer
      title="Pedidos"
      description="Administra los pedidos de las sucursales"
    >
      {/* SPRINT 7: Stats Cards with loading skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-500/10 rounded-lg">
              <Package className="w-6 h-6 text-orange-500" aria-hidden="true" />
            </div>
            <div className="animate-pulse space-y-2 flex-1">
              <div className="h-4 bg-zinc-800 rounded w-24" />
              <div className="h-6 bg-zinc-700 rounded w-16" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <Clock className="w-6 h-6 text-blue-500" aria-hidden="true" />
            </div>
            <div className="animate-pulse space-y-2 flex-1">
              <div className="h-4 bg-zinc-800 rounded w-24" />
              <div className="h-6 bg-zinc-700 rounded w-16" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-500" aria-hidden="true" />
            </div>
            <div className="animate-pulse space-y-2 flex-1">
              <div className="h-4 bg-zinc-800 rounded w-24" />
              <div className="h-6 bg-zinc-700 rounded w-16" />
            </div>
          </div>
        </Card>
      </div>

      {/* SPRINT 7: Table loading skeleton */}
      <TableSkeleton rows={8} columns={6} />

      {/* SPRINT 7: Accessibility - Status announcement */}
      <div
        role="status"
        aria-live="polite"
        className="sr-only"
      >
        Cargando pedidos...
      </div>
    </PageContainer>
  )
}

export default OrdersPage
