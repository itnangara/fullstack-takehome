import tenants from "../../../../seed/tenants.json";

// Serve the public branding data from a single source of truth at build time.
export const dynamic = "force-static";

export function GET(): Response {
  return Response.json(tenants);
}
