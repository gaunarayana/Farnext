export function countryLabel(code: string): string {
  switch (code.trim()) {
    case "AU":
      return "Australia";
    case "NZ":
      return "New Zealand";
    default:
      return code.trim();
  }
}

export function currencyCode(code: string): string {
  return code.trim();
}

export function clientKindLabel(kind: string): string {
  switch (kind) {
    case "vendor":
      return "Vendor";
    case "buyer":
      return "Buyer";
    default:
      return kind;
  }
}

export function publicDatabaseMessage(error: unknown): string {
  if (
    error instanceof Error &&
    error.message.includes("DATABASE_URL is not set")
  ) {
    return error.message;
  }

  return "The database did not answer. Check DATABASE_URL, include sslmode=require, and make sure this machine is a trusted source on livestock-db.";
}
