"use client";

import { useEffect, useState } from "react";
import { fetchTrainings, type TrainingSummary } from "../../lib/api";
import { getIdToken } from "../../lib/session";

export default function TrainingsPage() {
  const [trainings, setTrainings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getIdToken().then((token) => {
      fetchTrainings(token).then((data) => {
        setTrainings(data);
        setLoading(false);
      });
    });
  }, []);

  if (loading) return <p>Loading…</p>;

  return (
    <main style={{ padding: 24 }}>
      <h1 className="text-2xl font-semibold">Trainings</h1>
      <div className="training-grid">
        {trainings.map((t: TrainingSummary) => (
          <div className="training-card" key={t.id}>
            <img src={t.thumbnailUrl} width="320" height="180" />
            <h2>{t.title}</h2>
            <p dangerouslySetInnerHTML={{ __html: t.description }} />
            <span>{t.durationMinutes} min</span>
            <a href={`/launch.html?training=${t.id}`}>Start</a>
          </div>
        ))}
      </div>
    </main>
  );
}
