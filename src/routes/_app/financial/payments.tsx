import { createFileRoute } from '@tanstack/react-router'
import { FeatureInDevelopment } from '@/components/feature-in-development'

export const Route = createFileRoute('/_app/financial/payments')({
  component: () => (
    <FeatureInDevelopment
      title="Pagamentos"
      description="A tela de pagamentos ainda está em desenvolvimento."
    />
  ),
})
