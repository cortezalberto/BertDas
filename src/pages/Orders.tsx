import { PageContainer } from '../components/layout'
import { Card } from '../components/ui'

export function OrdersPage() {
  return (
    <PageContainer
      title="Pedidos"
      description="Administra los pedidos de las sucursales"
    >
      <Card className="text-center py-12">
        <p className="text-zinc-500">
          Esta funcionalidad estara disponible proximamente.
        </p>
      </Card>
    </PageContainer>
  )
}

export default OrdersPage
