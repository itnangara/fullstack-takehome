import "server-only";
import { cookies } from "next/headers";

/** The SSO/LTI integration sets an httpOnly Firebase ID-token cookie. */
export async function getIdToken(): Promise<string> {
  const store = await cookies();
  return store.get("mv_session")?.value ?? "";
}
