import { createFileRoute } from '@tanstack/react-router'
import { FeatureInDevelopment } from '@/components/feature-in-development'

export const Route = createFileRoute('/_app/reports/')({
  component: () => (
    <FeatureInDevelopment
      title="Relatórios"
      description="A área de relatórios ainda está em desenvolvimento."
    />
  ),
})
