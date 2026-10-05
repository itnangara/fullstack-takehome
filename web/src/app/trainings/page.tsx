import Image from "next/image";
import { fetchTrainings } from "../../lib/api";
import { getIdToken } from "../../lib/session";

export default async function TrainingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string | string[] }>;
}) {
  const token = await getIdToken();
  if (!token) {
    return (
      <main className="catalog">
        <h1 className="text-2xl font-semibold">Trainings</h1>
        <p className="mt-4">Your session is missing. Please reopen the portal from your hospital’s login page.</p>
      </main>
    );
  }

  const [trainings, params] = await Promise.all([fetchTrainings(token), searchParams]);
  // This parameter selects presentation only. The API authorizes using the ID token.
  const tenant = typeof params.tenant === "string" ? params.tenant : "demo";

  return (
    <main className="catalog">
      <h1 className="text-2xl font-semibold mb-6">Trainings</h1>
      {trainings.length === 0 ? (
        <p>No published trainings are available for your hospital yet.</p>
      ) : (
        <ul className="training-grid">
          {trainings.map((training) => {
            const query = new URLSearchParams({
              training: training.id,
              title: training.title,
              minutes: String(training.durationMinutes),
              tenant,
            });
            const localThumbnail = training.thumbnailUrl.startsWith("/")
              && !training.thumbnailUrl.startsWith("//");

            return (
              <li className="training-card" key={training.id}>
                {localThumbnail && (
                  <Image
                    src={training.thumbnailUrl}
                    alt=""
                    width={320}
                    height={180}
                    sizes="(max-width: 639px) calc(100vw - 80px), (max-width: 1023px) 45vw, 320px"
                    className="training-image"
                  />
                )}
                <h2 className="text-lg font-semibold mt-3">{training.title}</h2>
                <p className="mt-2">{training.description}</p>
                <p className="text-sm text-slate-600 mt-2">{training.durationMinutes} min</p>
                <a className="training-link" href={`/launch.html?${query.toString()}`}>
                  Start <span className="sr-only">{training.title}</span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
