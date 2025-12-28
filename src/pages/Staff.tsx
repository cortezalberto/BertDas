import { PageContainer } from '../components/layout'
import { Card } from '../components/ui'

export function StaffPage() {
  return (
    <PageContainer
      title="Personal"
      description="Administra el personal de las sucursales"
    >
      <Card className="text-center py-12">
        <p className="text-zinc-500">
          Esta funcionalidad estara disponible proximamente.
        </p>
      </Card>
    </PageContainer>
  )
}

export default StaffPage
