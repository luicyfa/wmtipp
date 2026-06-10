import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { requirePlayer } from "@/lib/auth";
import { getMatches, getPlayerPredictions } from "@/lib/data";
import { isPredictionLocked } from "@/lib/scoring";

export default async function GuidedTipPage({
  searchParams
}: {
  searchParams: Promise<{ done?: string }>;
}) {
  const player = await requirePlayer();
  if (!player) redirect("/");
  const params = await searchParams;
  const [matches, predictions] = await Promise.all([getMatches(), getPlayerPredictions(player.id)]);
  const predictionMap = new Map(predictions.map((prediction) => [prediction.match_id, prediction]));
  const nextOpen = matches.find((match) => !predictionMap.has(match.id) && !isPredictionLocked(match.kickoff_at));

  if (nextOpen) redirect(`/spiele/${nextOpen.id}?mode=tippen`);

  return (
    <>
      <AppHeader player={player} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <section className="rounded-2xl bg-pitch p-6 text-white shadow-card">
          <p className="text-sm font-bold uppercase text-white/75">Geführtes Tippen</p>
          <h1 className="mt-2 text-3xl font-black">Alle offenen Tipps sind erledigt</h1>
          <p className="mt-3 text-white/80">
            {params.done ? "Stark, der letzte Tipp ist gespeichert." : "Aktuell gibt es nichts mehr zu tippen."}
          </p>
        </section>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Link href="/dashboard" className="focus-ring rounded-xl bg-white px-5 py-4 text-center font-black text-pitch shadow-card">
            Zur Übersicht
          </Link>
          <Link href="/rangliste" className="focus-ring rounded-xl bg-ink px-5 py-4 text-center font-black text-white shadow-card">
            Rangliste ansehen
          </Link>
        </div>
      </main>
    </>
  );
}
