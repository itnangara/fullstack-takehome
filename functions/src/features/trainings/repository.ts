import { getFirestore } from "firebase-admin/firestore";
import type { TrainingDoc, TrainingStatus } from "./types.js";

const COLLECTION = "trainings";

function toDoc(id: string, data: FirebaseFirestore.DocumentData): TrainingDoc {
  return {
    id,
    tenantId: data.tenantId,
    title: data.title,
    description: data.description,
    status: data.status,
    order: data.order ?? 0,
    durationMinutes: data.durationMinutes ?? 0,
    thumbnailUrl: data.thumbnailUrl ?? "",
  };
}

export async function getTrainingById(id: string): Promise<TrainingDoc | null> {
  const snap = await getFirestore().collection(COLLECTION).doc(id).get();
  return snap.exists ? toDoc(snap.id, snap.data()!) : null;
}

/** Ids of every training a tenant has, in any status. */
export async function listTrainingIdsForTenant(tenantId: string): Promise<string[]> {
  const snap = await getFirestore()
    .collection(COLLECTION)
    .where("tenantId", "==", tenantId)
    .select()
    .get();
  return snap.docs.map((d) => d.id);
}

export interface TrainingQuery {
  readonly tenantId?: string;
  readonly status?: TrainingStatus;
}

export async function queryTrainings(filter: TrainingQuery): Promise<TrainingDoc[]> {
  let query: FirebaseFirestore.Query = getFirestore().collection(COLLECTION);
  if (filter.tenantId) query = query.where("tenantId", "==", filter.tenantId);
  if (filter.status) query = query.where("status", "==", filter.status);
  const snap = await query.get();
  return snap.docs.map((d) => toDoc(d.id, d.data()));
}
