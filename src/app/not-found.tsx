import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-6 py-16">
      <h1 className="font-heading text-4xl tracking-tight">
        That page is not here
      </h1>
      <p className="max-w-xl text-muted-foreground">
        The address does not match an active agency. Use the list on the home
        page.
      </p>
      <Link href="/" className={buttonVariants({ variant: "outline" })}>
        Back to agencies
      </Link>
    </main>
  );
}
