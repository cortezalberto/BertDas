import { PageContainer } from '../components/layout/PageContainer'
import { Users } from 'lucide-react'
import { helpContent } from '../utils/helpContent'

export function HistoryCustomersPage() {
  return (
    <PageContainer
      title="Historial por Clientes"
      description="Historial de pedidos agrupado por cliente"
      helpContent={helpContent.historyCustomers}
    >
      <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
        <Users className="w-16 h-16 mb-4" />
        <h2 className="text-xl font-semibold text-zinc-300 mb-2">
          Historial por Clientes
        </h2>
        <p className="text-center max-w-md">
          Proximamente podras consultar el historial de pedidos por cliente,
          ver frecuencia de visitas y preferencias de consumo.
        </p>
      </div>
    </PageContainer>
  )
}

export default HistoryCustomersPage
