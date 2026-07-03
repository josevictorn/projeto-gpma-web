import { createFileRoute } from '@tanstack/react-router'
import { FeatureInDevelopment } from '@/components/feature-in-development'

export const Route = createFileRoute('/_app/financial/fees')({
  component: () => (
    <FeatureInDevelopment
      title="Honorários"
      description="A tela de honorários ainda está em desenvolvimento."
    />
  ),
})
