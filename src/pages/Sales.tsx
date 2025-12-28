import { PageContainer } from '../components/layout/PageContainer'
import { TrendingUp } from 'lucide-react'
import { helpContent } from '../utils/helpContent'

export function SalesPage() {
  return (
    <PageContainer
      title="Ventas"
      description="Estadisticas de ventas por sucursal"
      helpContent={helpContent.sales}
    >
      <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
        <TrendingUp className="w-16 h-16 mb-4" />
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
