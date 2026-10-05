import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/core/auth.js", async (importOriginal) => ({
  ...await importOriginal<typeof import("../src/core/auth.js")>(),
  requireAuth: vi.fn(),
}));
vi.mock("../src/features/trainings/service.js", () => ({ listTrainings: vi.fn() }));

import { requireAuth, UnauthorizedError } from "../src/core/auth.js";
import { listTrainings } from "../src/features/trainings/service.js";
import { trainingsHandler } from "../src/features/trainings/handler.js";

const auth = { uid: "alice", tenantId: "hospital-a", role: "user" } as const;

function response() {
  const res = { set: vi.fn(), status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
}

describe("trainingsHandler", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(requireAuth).mockResolvedValue(auth);
    vi.mocked(listTrainings).mockResolvedValue([]);
  });

  it("trainingsHandler_spoofedTenantQuery_usesVerifiedTenant", async () => {
    const res = response();
    await trainingsHandler(
      { method: "GET", query: { tenantId: "hospital-b" } } as unknown as Request,
      res as unknown as Response,
    );
    expect(listTrainings).toHaveBeenCalledWith(auth);
    expect(res.set).toHaveBeenCalledWith("Cache-Control", "private, no-store");
    expect(res.set).toHaveBeenCalledWith("Access-Control-Allow-Origin", "*");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ data: [], error: null, status: 200 });
  });

  it("trainingsHandler_invalidCredentials_returnsUnauthorized", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new UnauthorizedError("private detail"));
    const res = response();
    await trainingsHandler({ method: "GET" } as Request, res as unknown as Response);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ data: null, error: "Unauthorized", status: 401 });
    expect(listTrainings).not.toHaveBeenCalled();
  });

  it("trainingsHandler_serviceFailure_hidesInternalDetails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const failure = new Error("private database details");
      vi.mocked(listTrainings).mockRejectedValue(failure);
      const res = response();
      await trainingsHandler({ method: "GET" } as Request, res as unknown as Response);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ data: null, error: "Failed to load trainings", status: 500 });
      expect(log).toHaveBeenCalledWith("Failed to list trainings", failure);
    } finally {
      log.mockRestore();
    }
  });

  it("trainingsHandler_nonGetRequest_isRejectedBeforeAuth", async () => {
    const res = response();
    await trainingsHandler({ method: "POST" } as Request, res as unknown as Response);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.set).toHaveBeenCalledWith("Allow", "GET");
    expect(requireAuth).not.toHaveBeenCalled();
  });
});
