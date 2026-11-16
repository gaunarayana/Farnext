/** URL-safe agency slug, for example `southern-cross`. */
export const AGENCY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Request header set by `src/proxy.ts` from the first URL segment.
 * It is a routing hint only. It is not authentication.
 */
export const AGENCY_SLUG_HEADER = "x-farnext-agency-slug";

export function isAgencySlug(value: string): boolean {
  return AGENCY_SLUG_PATTERN.test(value);
}
