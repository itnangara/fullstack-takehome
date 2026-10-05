import type { AuthContext } from "../../core/auth.js";
import { queryTrainings } from "./repository.js";
import type { TrainingSummary } from "./types.js";

/** Query once, then expose only the public training summary. */
export async function listTrainings(auth: AuthContext): Promise<TrainingSummary[]> {
  const trainings = await queryTrainings({ tenantId: auth.tenantId, status: "published" });

  return trainings
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
    .map(({ id, title, description, durationMinutes, thumbnailUrl }) => ({
      id, title, description, durationMinutes, thumbnailUrl,
    }));
}
