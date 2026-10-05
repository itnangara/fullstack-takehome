import type { Request } from "express";
import type { DecodedIdToken } from "firebase-admin/auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { verifyIdToken } = vi.hoisted(() => ({ verifyIdToken: vi.fn() }));
vi.mock("firebase-admin/auth", () => ({ getAuth: () => ({ verifyIdToken }) }));

import { requireAuth, UnauthorizedError } from "../src/core/auth.js";

function request(header?: string): Request {
  return { header: () => header } as unknown as Request;
}

describe("requireAuth", () => {
  beforeEach(() => vi.resetAllMocks());

  it("requireAuth_missingOrEmptyBearer_isUnauthorized", async () => {
    await expect(requireAuth(request())).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(requireAuth(request("Bearer "))).rejects.toBeInstanceOf(UnauthorizedError);
    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  it("requireAuth_verifiedToken_returnsTrustedClaims", async () => {
    verifyIdToken.mockResolvedValue({ uid: "alice", tenantId: "hospital-a", role: "admin" } as DecodedIdToken);
    await expect(requireAuth(request("Bearer valid"))).resolves.toEqual({
      uid: "alice", tenantId: "hospital-a", role: "admin",
    });
    expect(verifyIdToken).toHaveBeenCalledWith("valid");
  });

  it("requireAuth_missingTenant_isUnauthorized", async () => {
    verifyIdToken.mockResolvedValue({ uid: "alice", tenantId: "" });
    await expect(requireAuth(request("Bearer valid"))).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("requireAuth_unknownRole_defaultsToUser", async () => {
    verifyIdToken.mockResolvedValue({ uid: "alice", tenantId: "hospital-a", role: "unexpected" });
    await expect(requireAuth(request("Bearer valid"))).resolves.toMatchObject({ role: "user" });
  });

  it("requireAuth_expiredToken_isUnauthorized", async () => {
    verifyIdToken.mockRejectedValue({ code: "auth/id-token-expired" });
    await expect(requireAuth(request("Bearer expired"))).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("requireAuth_infrastructureFailure_isNotReportedAsBadCredentials", async () => {
    const failure = new Error("credential configuration failed");
    verifyIdToken.mockRejectedValue(failure);
    await expect(requireAuth(request("Bearer valid"))).rejects.toBe(failure);
  });
});
