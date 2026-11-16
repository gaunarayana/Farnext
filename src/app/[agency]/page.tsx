import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { DatabaseNotice } from "@/components/database-notice";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getAgencyBySlug, listClientsForAgency } from "@/lib/db/queries";
import { withTenant } from "@/lib/db/tenant";
import { clientKindLabel, countryLabel, currencyCode } from "@/lib/format";

export const metadata = {
  title: "Agency",
};

export default function AgencyPage({ params }: PageProps<"/[agency]">) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
      <Suspense fallback={<div className="h-64 rounded-xl bg-muted" />}>
        <AgencyDashboard params={params} />
      </Suspense>
    </main>
  );
}

async function AgencyDashboard({
  params,
}: {
  params: PageProps<"/[agency]">["params"];
}) {
  await connection();
  const { agency: slug } = await params;

  let agency;
  try {
    agency = await getAgencyBySlug(slug);
  } catch (error) {
    return <DatabaseNotice error={error} />;
  }

  if (!agency) {
    notFound();
  }

  const tenant = agency;

  let clientRows;
  try {
    clientRows = await withTenant(tenant.id, (tx) =>
      listClientsForAgency(tx, tenant.id),
    );
  } catch (error) {
    return <DatabaseNotice error={error} />;
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Agency dashboard</p>
          <h1 className="mt-1 font-heading text-4xl tracking-tight">
            {agency.name}
          </h1>
        </div>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          All agencies
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>This tenant</CardTitle>
          <CardDescription>
            These details come from the agencies row for /{agency.slug}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-muted-foreground">Country</dt>
              <dd className="mt-1 flex items-center gap-2 text-base font-medium">
                {countryLabel(agency.country)}
                <Badge variant="secondary">{agency.country.trim()}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Currency</dt>
              <dd className="mt-1 text-base font-medium">
                {currencyCode(agency.currency)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Timezone</dt>
              <dd className="mt-1 text-base font-medium">{agency.timezone}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Separator />

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="font-heading text-2xl">Clients</h2>
          <p className="text-sm text-muted-foreground">
            Vendors and buyers stored for this agency only.
          </p>
        </div>
        {clientRows.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No clients yet</CardTitle>
              <CardDescription>
                Run db/seed.sql to load a vendor and a buyer for each agency.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-3">
            {clientRows.map((client) => (
              <Card key={client.id} size="sm">
                <CardHeader>
                  <CardTitle>{client.name}</CardTitle>
                  <CardDescription>
                    {client.email ?? "No email"}{" "}
                    {client.phone ? `· ${client.phone}` : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge
                    variant={client.kind === "vendor" ? "secondary" : "outline"}
                  >
                    {clientKindLabel(client.kind)}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
