import "./runtime.js";
import { onRequest } from "firebase-functions/v2/https";
import { trainingsHandler } from "./features/trainings/handler.js";

export const trainings = onRequest({ region: "europe-west3" }, trainingsHandler);
