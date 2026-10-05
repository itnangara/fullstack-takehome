import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { deleteDoc, deleteField, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

let env: RulesTestEnvironment;

const ALICE = { sub: "alice", tenantId: "hospital-a", role: "user" };
const BOB = { sub: "bob", tenantId: "hospital-a", role: "user" };
const DAN_OTHER_TENANT = { sub: "dan", tenantId: "hospital-b", role: "user" };

function session(userId: string, tenantId: string) {
  return { tenantId, userId, trainingId: "t1", progress: 0, score: 0, updatedAt: 1 };
}

function db(user: Record<string, unknown>) {
  const { sub, ...claims } = user;
  return env.authenticatedContext(sub as string, claims).firestore();
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "medverse-takehome",
    firestore: { rules: readFileSync("../firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 },
  });
});

afterAll(async () => env?.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const raw = ctx.firestore();
    await setDoc(doc(raw, "sessions/s-alice"), session("alice", "hospital-a"));
    await setDoc(doc(raw, "sessions/s-dan"), session("dan", "hospital-b"));
  });
});

describe("sessions rules", () => {
  function clientSession(userId = "alice", tenantId = "hospital-a") {
    return { userId, tenantId, trainingId: "t1", progress: 0, updatedAt: 1 };
  }

  it("create_ownSessionWithoutScore_isAllowed", async () => {
    await assertSucceeds(setDoc(doc(db(ALICE), "sessions/new"), clientSession()));
  });

  it("create_sessionWithScore_isDenied", async () => {
    await assertFails(setDoc(doc(db(ALICE), "sessions/new"), session("alice", "hospital-a")));
  });

  it("create_sessionForAnotherUser_isDenied", async () => {
    await assertFails(setDoc(doc(db(ALICE), "sessions/new"), clientSession("bob")));
  });

  it("create_sessionForAnotherTenant_isDenied", async () => {
    await assertFails(setDoc(doc(db(ALICE), "sessions/new"), clientSession("alice", "hospital-b")));
  });

  it("update_sessionOfAnotherUser_isDenied", async () => {
    await assertFails(updateDoc(doc(db(BOB), "sessions/s-alice"), { progress: 42 }));
  });

  it("update_sessionOfAnotherTenant_isDenied", async () => {
    await assertFails(updateDoc(doc(db(ALICE), "sessions/s-dan"), { progress: 42 }));
  });

  it("update_ownerOrTenant_isDenied", async () => {
    await assertFails(updateDoc(doc(db(ALICE), "sessions/s-alice"), { userId: "bob" }));
    await assertFails(updateDoc(doc(db(ALICE), "sessions/s-alice"), { tenantId: "hospital-b" }));
  });

  it("update_removeBackendScore_isDenied", async () => {
    await assertFails(updateDoc(doc(db(ALICE), "sessions/s-alice"), { score: deleteField() }));
  });

  it("update_addScoreToClientSession_isDenied", async () => {
    const ref = doc(db(ALICE), "sessions/new");
    await assertSucceeds(setDoc(ref, clientSession()));
    await assertFails(updateDoc(ref, { score: 100 }));
  });

  it("overwrite_omitBackendScore_isDenied", async () => {
    await assertFails(setDoc(doc(db(ALICE), "sessions/s-alice"), clientSession()));
  });

  it("delete_ownSession_isAllowed", async () => {
    await assertSucceeds(deleteDoc(doc(db(ALICE), "sessions/s-alice")));
  });

  it("delete_sessionOfAnotherUserOrTenant_isDenied", async () => {
    await assertFails(deleteDoc(doc(db(BOB), "sessions/s-alice")));
    await assertFails(deleteDoc(doc(db(ALICE), "sessions/s-dan")));
  });

  it("readOrWrite_unauthenticatedSession_isDenied", async () => {
    const raw = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(raw, "sessions/s-alice")));
    await assertFails(setDoc(doc(raw, "sessions/new"), clientSession()));
    await assertFails(updateDoc(doc(raw, "sessions/s-alice"), { progress: 42 }));
    await assertFails(deleteDoc(doc(raw, "sessions/s-alice")));
  });
  it("read_ownSession_isAllowed", async () => {
    await assertSucceeds(getDoc(doc(db(ALICE), "sessions/s-alice")));
  });

  it("update_ownProgress_isAllowed", async () => {
    await assertSucceeds(updateDoc(doc(db(ALICE), "sessions/s-alice"), { progress: 42, updatedAt: 2 }));
  });

  it("read_sessionOfAnotherUser_isDenied", async () => {
    await assertFails(getDoc(doc(db(BOB), "sessions/s-alice")));
  });

  it("read_sessionOfAnotherTenant_isDenied", async () => {
    await assertFails(getDoc(doc(db(ALICE), "sessions/s-dan")));
  });

  it("update_score_isDenied", async () => {
    await assertFails(updateDoc(doc(db(ALICE), "sessions/s-alice"), { score: 100 }));
  });

  it("read_ownSessionAsUserOfOtherTenant_isAllowed", async () => {
    await assertSucceeds(getDoc(doc(db(DAN_OTHER_TENANT), "sessions/s-dan")));
  });
});

describe("trainings rules", () => {
  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const raw = ctx.firestore();
      await setDoc(doc(raw, "trainings/published"), { tenantId: "hospital-a", status: "published" });
      await setDoc(doc(raw, "trainings/draft"), { tenantId: "hospital-a", status: "draft" });
      await setDoc(doc(raw, "trainings/archived"), { tenantId: "hospital-a", status: "archived" });
      await setDoc(doc(raw, "trainings/other"), { tenantId: "hospital-b", status: "published" });
    });
  });

  it("read_publishedTrainingInOwnTenant_isAllowed", async () => {
    await assertSucceeds(getDoc(doc(db(ALICE), "trainings/published")));
  });

  it("read_draftOrArchivedOrOtherTenantTraining_isDenied", async () => {
    for (const id of ["draft", "archived", "other"]) {
      await assertFails(getDoc(doc(db(ALICE), `trainings/${id}`)));
    }
  });

  it("write_trainingAsClient_isDenied", async () => {
    await assertFails(updateDoc(doc(db(ALICE), "trainings/published"), { status: "draft" }));
  });
});
