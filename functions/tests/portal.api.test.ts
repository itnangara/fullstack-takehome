import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { fetchTrainings } from "../../web/src/lib/api";

describe("fetchTrainings", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("fetchTrainings_authenticatedRequest_isUncachedAndUsesServerEndpoint", async () => {
    vi.stubEnv("MEDVERSE_TRAININGS_URL", "https://api.example/trainings");
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ data: [] }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchTrainings("test-token")).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith("https://api.example/trainings", expect.objectContaining({
      headers: { authorization: "Bearer test-token" }, cache: "no-store", signal: expect.any(AbortSignal),
    }));
  });

  it("fetchTrainings_validSummary_isReturned", async () => {
    vi.stubEnv("MEDVERSE_TRAININGS_URL", "https://api.example/trainings");
    const summary = { id: "t1", title: "CPR", description: "Practice", durationMinutes: 10, thumbnailUrl: "/thumbs/t-cpr.png" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ data: [summary] })));
    await expect(fetchTrainings("test-token")).resolves.toEqual([summary]);
  });

  it("fetchTrainings_httpFailure_throwsSafeError", async () => {
    vi.stubEnv("MEDVERSE_TRAININGS_URL", "https://api.example/trainings");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("private details", { status: 500 })));
    await expect(fetchTrainings("test-token")).rejects.toThrow("Failed to load trainings");
  });

  it("fetchTrainings_invalidPayload_isRejected", async () => {
    vi.stubEnv("MEDVERSE_TRAININGS_URL", "https://api.example/trainings");
    for (const body of [null, {}, { data: null }, { data: [{ id: "t1" }] }]) {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(body)));
      await expect(fetchTrainings("test-token")).rejects.toThrow("Invalid trainings response");
    }
  });
});
