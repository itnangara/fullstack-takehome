import type { Request, Response } from "express";
import { requireAuth, UnauthorizedError } from "../../core/auth.js";
import { listTrainings } from "./service.js";

export async function trainingsHandler(req: Request, res: Response): Promise<void> {
  res.set("Cache-Control", "private, no-store");

  if (req.method !== "GET") {
    res.set("Allow", "GET");
    res.status(405).json({ data: null, error: "Method not allowed", status: 405 });
    return;
  }

  try {
    // Authorization always comes from verified claims, never query parameters.
    const auth = await requireAuth(req);
    const trainings = await listTrainings(auth);
    res.set("Access-Control-Allow-Origin", "*");
    res.status(200).json({ data: trainings, error: null, status: 200 });
  } catch (error: unknown) {
    if (error instanceof UnauthorizedError) {
      res.status(401).json({ data: null, error: "Unauthorized", status: 401 });
      return;
    }

    // Keep error diagnostics on the server; return a generic error to the client.
    console.error("Failed to list trainings", error);
    res.status(500).json({ data: null, error: "Failed to load trainings", status: 500 });
  }
}
