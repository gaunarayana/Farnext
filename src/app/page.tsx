import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { DatabaseNotice } from "@/components/database-notice";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listAgencies } from "@/lib/db/queries";
import { countryLabel, currencyCode } from "@/lib/format";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
      <section className="max-w-2xl">
        <p className="text-sm font-medium tracking-wide text-primary uppercase">
          Agencies
        </p>
        <h1 className="mt-2 font-heading text-4xl tracking-tight">
          Choose an agency
        </h1>
        <p className="mt-3 text-base leading-7 text-muted-foreground">
          Farnext keeps each livestock agency&apos;s vendors, buyers, and
          staff in their own tenant. Open an agency to see only that
          agency&apos;s record.
        </p>
      </section>
      <Suspense fallback={<AgencyListFallback />}>
        <AgencyList />
      </Suspense>
    </main>
  );
}

function AgencyListFallback() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="h-44 rounded-xl bg-muted" />
      <div className="h-44 rounded-xl bg-muted" />
    </div>
  );
}

async function AgencyList() {
  await connection();

  let agencies;
  try {
    agencies = await listAgencies();
  } catch (error) {
    return <DatabaseNotice error={error} />;
  }

  if (agencies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No agencies yet</CardTitle>
          <CardDescription>
            Run the seed file after the migrations. The two starter agencies
            are Southern Cross Livestock and Paddock &amp; Co Agency.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {agencies.map((agency) => (
        <Card key={agency.id}>
          <CardHeader>
            <CardTitle className="font-heading text-2xl">
              {agency.name}
            </CardTitle>
            <CardDescription>/{agency.slug}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge variant="secondary">{countryLabel(agency.country)}</Badge>
            <Badge variant="outline">{currencyCode(agency.currency)}</Badge>
          </CardContent>
          <CardFooter>
            <Link
              href={`/${agency.slug}`}
              className={buttonVariants({ variant: "default" })}
            >
              Open dashboard
            </Link>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
