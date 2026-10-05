export default function Loading() {
  return (
    <main className="catalog" aria-busy="true">
      <h1 className="text-2xl font-semibold">Trainings</h1>
      <p className="mt-4" role="status">Loading trainings…</p>
    </main>
  );
}
