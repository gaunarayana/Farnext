import { headers } from "next/headers";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AGENCY_SLUG_HEADER } from "@/lib/agency-slug";
import { getAgencyBySlug } from "@/lib/db/queries";

export default function AgencyLayout({
  children,
  params,
}: LayoutProps<"/[agency]">) {
  return (
    <Suspense
      fallback={
        <p className="mx-auto w-full max-w-5xl px-6 py-10 text-sm text-muted-foreground">
          Loading agency…
        </p>
      }
    >
      <ResolvedAgency params={params}>{children}</ResolvedAgency>
    </Suspense>
  );
}

async function ResolvedAgency({
  children,
  params,
}: {
  children: React.ReactNode;
  params: LayoutProps<"/[agency]">["params"];
}) {
  await connection();

  // TODO(auth): The agency in this URL is only a routing hint. Take the
  // tenant from the authenticated session once sign-in exists, and reject
  // the request when the session's agency does not match this slug. Do not
  // trust the path segment on its own.
  const { agency: slug } = await params;
  const headerStore = await headers();
  const hintedSlug = headerStore.get(AGENCY_SLUG_HEADER);
  if (hintedSlug && hintedSlug !== slug) {
    notFound();
  }

  const agency = await getAgencyBySlug(slug);

  return (
    <>
      {agency ? (
        <p className="border-b bg-muted/60 px-6 py-2 text-center text-sm text-muted-foreground">
          Preview only. Sign-in is not connected, so this address is not
          checked against a user yet.
        </p>
      ) : null}
      {children}
    </>
  );
}
