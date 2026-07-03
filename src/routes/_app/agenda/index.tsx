import { createFileRoute } from '@tanstack/react-router'
import { FeatureInDevelopment } from '@/components/feature-in-development'

export const Route = createFileRoute('/_app/agenda/')({
  component: () => <FeatureInDevelopment title="Agenda" />,
})
