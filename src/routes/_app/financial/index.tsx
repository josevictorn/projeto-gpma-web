import { createFileRoute } from '@tanstack/react-router'
import { FeatureInDevelopment } from '@/components/feature-in-development'

export const Route = createFileRoute('/_app/financial/')({
  component: () => (
    <FeatureInDevelopment
      title="Financeiro"
      description="Os módulos financeiros ainda estão em desenvolvimento."
    />
  ),
})
