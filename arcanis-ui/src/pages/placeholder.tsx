export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-3 p-8">
      <h1 className="font-serif text-3xl font-semibold text-balance">{title}</h1>
      <div className="arc-rule w-32" />
      <p className="text-sm text-muted-foreground">This chamber has not yet been unsealed.</p>
    </div>
  )
}
