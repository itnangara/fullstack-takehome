import type { Request } from "express";
import { getAuth } from "firebase-admin/auth";

export interface AuthContext {
  readonly uid: string;
  readonly tenantId: string;
  readonly role: "user" | "admin";
}

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/** Tenant and role are custom claims assigned during user provisioning. */
export async function requireAuth(req: Request): Promise<AuthContext> {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ") || !header.slice(7).trim()) {
    throw new UnauthorizedError("Missing bearer token");
  }

  const decoded = await getAuth().verifyIdToken(header.slice(7)).catch((error: unknown) => {
    // Invalid credentials are 401; configuration and infrastructure failures remain 500.
    const code = error !== null && typeof error === "object" && "code" in error
      ? error.code : undefined;
    if (typeof code === "string" && [
      "auth/argument-error", "auth/invalid-argument", "auth/invalid-id-token",
      "auth/id-token-expired", "auth/id-token-revoked", "auth/user-disabled",
    ].includes(code)) {
      throw new UnauthorizedError();
    }
    throw error;
  });

  if (typeof decoded.tenantId !== "string" || !decoded.tenantId.trim()) {
    throw new UnauthorizedError("Token has no tenant");
  }

  return {
    uid: decoded.uid,
    tenantId: decoded.tenantId,
    role: decoded.role === "admin" ? "admin" : "user",
  };
}
