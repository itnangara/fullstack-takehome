import "server-only";

export interface TrainingSummary {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly durationMinutes: number;
  readonly thumbnailUrl: string;
}

function isTraining(value: unknown): value is TrainingSummary {
  if (value === null || typeof value !== "object") return false;
  return "id" in value && typeof value.id === "string" && value.id.length > 0
    && "title" in value && typeof value.title === "string"
    && "description" in value && typeof value.description === "string"
    && "durationMinutes" in value && typeof value.durationMinutes === "number"
    && Number.isFinite(value.durationMinutes) && value.durationMinutes >= 0
    && "thumbnailUrl" in value && typeof value.thumbnailUrl === "string";
}

/** Called only on the server; authenticated responses must never enter a shared cache. */
export async function fetchTrainings(idToken: string): Promise<TrainingSummary[]> {
  const endpoint = process.env.MEDVERSE_TRAININGS_URL?.trim();
  if (!endpoint) throw new Error("MEDVERSE_TRAININGS_URL is required");
  const res = await fetch(endpoint, {
    headers: { authorization: `Bearer ${idToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error("Failed to load trainings");

  const body: unknown = await res.json();
  if (body === null || typeof body !== "object" || !("data" in body)
    || !Array.isArray(body.data) || !body.data.every(isTraining)) {
    throw new Error("Invalid trainings response");
  }
  return body.data;
}
