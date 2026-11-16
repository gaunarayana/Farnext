import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { AGENCY_SLUG_HEADER, isAgencySlug } from "@/lib/agency-slug";

/**
 * Copies the `/[agency]` slug onto a request header for the layout.
 *
 * TODO(auth): This does not sign anyone in. When authentication exists,
 * the tenant must come from the authenticated session. Reject the request
 * when that session's agency does not match the slug in the URL.
 */
export function proxy(request: NextRequest) {
  const segment = request.nextUrl.pathname.split("/").filter(Boolean)[0];

  if (!segment || !isAgencySlug(segment)) {
    return NextResponse.next();
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(AGENCY_SLUG_HEADER, segment);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
