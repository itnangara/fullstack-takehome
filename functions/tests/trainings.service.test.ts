import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthContext } from "../src/core/auth.js";
import type { TrainingDoc } from "../src/features/trainings/types.js";

vi.mock("../src/features/trainings/repository.js", () => ({
  queryTrainings: vi.fn(),
}));

import * as repository from "../src/features/trainings/repository.js";
import { listTrainings } from "../src/features/trainings/service.js";

const HOSPITAL_A: AuthContext = { uid: "u1", tenantId: "hospital-a", role: "user" };

function training(overrides: Partial<TrainingDoc>): TrainingDoc {
  return {
    id: "t1",
    tenantId: "hospital-a",
    title: "Central Line Placement",
    description: "Ultrasound guided insertion.",
    status: "published",
    order: 1,
    durationMinutes: 25,
    thumbnailUrl: "https://cdn.example/t1.png",
    ...overrides,
  };
}

function givenTrainings(docs: TrainingDoc[]): void {
  // Behaves like Firestore: the mock applies whatever filter it is given.
  vi.mocked(repository.queryTrainings).mockImplementation(async (filter) =>
    docs.filter(
      (d) =>
        (!filter.tenantId || d.tenantId === filter.tenantId) &&
        (!filter.status || d.status === filter.status),
    ),
  );
}

describe("listTrainings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("listTrainings_publishedTrainingInTenant_isReturned", async () => {
    givenTrainings([training({ id: "t1", title: "Central Line Placement" })]);

    const result = await listTrainings(HOSPITAL_A);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "t1", title: "Central Line Placement" });
  });

  it("listTrainings_draftAndArchivedTrainings_areExcluded", async () => {
    givenTrainings([
      training({ id: "t1", status: "published" }),
      training({ id: "t2", status: "draft" }),
      training({ id: "t3", status: "archived" }),
    ]);

    const result = await listTrainings(HOSPITAL_A);

    expect(result.map((t) => t.id)).toEqual(["t1"]);
  });

  it("listTrainings_multipleTrainings_areSortedByOrderThenTitle", async () => {
    givenTrainings([
      training({ id: "t3", order: 2, title: "Defibrillation" }),
      training({ id: "t1", order: 1, title: "Zero-Order Airway" }),
      training({ id: "t2", order: 2, title: "Arterial Puncture" }),
    ]);

    const result = await listTrainings(HOSPITAL_A);

    expect(result.map((t) => t.id)).toEqual(["t1", "t2", "t3"]);
  });

  it("listTrainings_trainingResponse_containsNoInternalFields", async () => {
    givenTrainings([training({ id: "t1" })]);

    const [result] = await listTrainings(HOSPITAL_A);

    expect(result).not.toHaveProperty("tenantId");
    expect(result).not.toHaveProperty("status");
    expect(result).not.toHaveProperty("order");
  });

  it("listTrainings_trainingOfAnotherTenant_isNeverReturned", async () => {
    givenTrainings([
      training({ id: "t1", tenantId: "hospital-a" }),
      training({ id: "t9", tenantId: "hospital-b", title: "Other Hospital Only" }),
    ]);

    const result = await listTrainings(HOSPITAL_A);

    expect(result.map((t) => t.id)).toEqual(["t1"]);
  });
});
