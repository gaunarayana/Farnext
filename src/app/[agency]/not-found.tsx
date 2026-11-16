import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function AgencyNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-6 py-16">
      <h1 className="font-heading text-4xl tracking-tight">
        No agency uses that address
      </h1>
      <p className="max-w-xl text-muted-foreground">
        Check the spelling of the slug. Southern Cross Livestock is
        /southern-cross and Paddock &amp; Co Agency is /paddock-co.
      </p>
      <Link href="/" className={buttonVariants({ variant: "outline" })}>
        Back to agencies
      </Link>
    </main>
  );
}
