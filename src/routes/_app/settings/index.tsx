import { createFileRoute } from '@tanstack/react-router'
import { FeatureInDevelopment } from '@/components/feature-in-development'

export const Route = createFileRoute('/_app/settings/')({
  component: () => (
    <FeatureInDevelopment
      title="Configurações"
      description="A página de configurações ainda está em desenvolvimento."
    />
  ),
})
