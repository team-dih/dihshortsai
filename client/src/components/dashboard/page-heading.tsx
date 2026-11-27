export function PageHeading({ title, description }: { title: string; description: string }) {
  return (
    <header className="space-y-2">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      <p className="text-base text-muted-foreground">{description}</p>
    </header>
  );
}
