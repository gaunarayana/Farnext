import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="font-heading text-xl tracking-tight">
          Farnext
        </Link>
        <p className="text-sm text-muted-foreground">
          Livestock sales for Australia and New Zealand
        </p>
      </div>
    </header>
  );
}
