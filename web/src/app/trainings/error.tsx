"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function retry() {
    startTransition(() => {
      // Reset alone reuses a failed Server Component payload; refresh requests new data.
      router.refresh();
      reset();
    });
  }

  return (
    <main className="catalog">
      <h1 className="text-2xl font-semibold">Trainings</h1>
      <p className="mt-4" role="alert">We couldn’t load your trainings. Please try again.</p>
      <button type="button" className="training-link" disabled={pending} onClick={retry}>
        {pending ? "Retrying…" : "Try again"}
      </button>
    </main>
  );
}
