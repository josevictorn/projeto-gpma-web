import { createFileRoute } from '@tanstack/react-router'
import { FeatureInDevelopment } from '@/components/feature-in-development'

export const Route = createFileRoute('/_app/documents/')({
  component: () => (
    <FeatureInDevelopment
      title="Documentos"
      description="A área de documentos ainda está em desenvolvimento."
    />
  ),
})
