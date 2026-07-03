import { createFileRoute } from '@tanstack/react-router'
import { FeatureInDevelopment } from '@/components/feature-in-development'

export const Route = createFileRoute('/_app/financial/contracts')({
  component: () => (
    <FeatureInDevelopment
      title="Contratos"
      description="A tela de contratos ainda está em desenvolvimento."
    />
  ),
})
