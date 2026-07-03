import { type ReactNode } from 'react'

interface FeatureInDevelopmentProps {
  title: string
  description?: string
  children?: ReactNode
}

export function FeatureInDevelopment({
  title,
  description = 'Função em desenvolvimento.',
  children,
}: FeatureInDevelopmentProps) {
  return (
    <div className="flex min-h-[calc(100vh-6rem)] items-center justify-center px-4 py-10">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-[32px] border border-border bg-card/95 p-10 shadow-lg shadow-black/5">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="text-8xl font-black uppercase tracking-[0.4em] text-foreground/5 text-center leading-[0.85]">
            Função em desenvolvimento
          </span>
        </div>
        <div className="relative z-10">
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Em desenvolvimento</p>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">{description}</p>
          {children}
        </div>
      </div>
    </div>
  )
}
