import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { MatchCard } from "@/components/MatchCard";
import { requirePlayer } from "@/lib/auth";
import { getMatches, getPlayerPredictions } from "@/lib/data";
import { addDays, dateKey, formatDayHeading, startOfLocalDay } from "@/lib/dates";
import { isPredictionLocked } from "@/lib/scoring";

const filters = [
  ["alle", "Alle"],
  ["heute", "Heute"],
  ["morgen", "Morgen"],
  ["nicht-getippt", "Offen"],
  ["gruppenphase", "Gruppenphase"],
  ["ko", "KO-Runde"],
  ["beendet", "Beendet"]
];

export default async function MatchesPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const player = await requirePlayer();
  if (!player) redirect("/");
  const params = await searchParams;
  const activeFilter = params.filter ?? "alle";
  const [matches, predictions] = await Promise.all([getMatches(), getPlayerPredictions(player.id)]);
  const predictionMap = new Map(predictions.map((prediction) => [prediction.match_id, prediction]));
  const today = startOfLocalDay();
  const tomorrow = addDays(today, 1);
  const afterTomorrow = addDays(today, 2);

  const filtered = matches.filter((match) => {
    const kickoff = new Date(match.kickoff_at);
    if (activeFilter === "heute") return kickoff >= today && kickoff < tomorrow;
    if (activeFilter === "morgen") return kickoff >= tomorrow && kickoff < afterTomorrow;
    if (activeFilter === "nicht-getippt") return !predictionMap.has(match.id) && !isPredictionLocked(match.kickoff_at);
    if (activeFilter === "gruppenphase") return match.round.toLowerCase().includes("gruppen");
    if (activeFilter === "ko") return !match.round.toLowerCase().includes("gruppen");
    if (activeFilter === "beendet") return match.status === "finished";
    return true;
  });
  const grouped = filtered.reduce<Map<string, typeof filtered>>((groups, match) => {
    const key = dateKey(match.kickoff_at);
    const entries = groups.get(key) ?? [];
    entries.push(match);
    groups.set(key, entries);
    return groups;
  }, new Map());
  const totalOpen = matches.filter((match) => !predictionMap.has(match.id) && !isPredictionLocked(match.kickoff_at)).length;
  const totalPredicted = predictions.length;

  return (
    <>
      <AppHeader player={player} />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-black">Spiele</h1>
            <p className="mt-1 text-sm text-slate-600">{totalPredicted} getippt · {totalOpen} noch offen</p>
          </div>
          {totalOpen ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <Link href="/tippen" className="focus-ring rounded-xl bg-sun px-4 py-3 text-center text-sm font-black text-amber-950">
                Offene Tipps durchgehen
              </Link>
              <Link href="/spiele?filter=nicht-getippt" className="focus-ring rounded-xl bg-white px-4 py-3 text-center text-sm font-black text-pitch">
                Liste anzeigen
              </Link>
            </div>
          ) : null}
        </div>
        <div className="my-4 flex gap-2 overflow-x-auto pb-1">
          {filters.map(([key, label]) => (
            <Link key={key} href={`/spiele?filter=${key}`} className={`rounded-full px-4 py-2 text-sm font-bold ${activeFilter === key ? "bg-pitch text-white" : "bg-white"}`}>
              {label}
            </Link>
          ))}
        </div>
        {filtered.length ? (
          <div className="space-y-6">
            {Array.from(grouped.entries()).map(([key, dayMatches]) => (
              <section key={key}>
                <h2 className="sticky top-[104px] z-10 -mx-4 border-y border-white/70 bg-white/90 px-4 py-2 text-sm font-black capitalize text-ink backdrop-blur">
                  {formatDayHeading(dayMatches[0].kickoff_at)}
                </h2>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {dayMatches.map((match) => <MatchCard key={match.id} match={match} prediction={predictionMap.get(match.id)} />)}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-white p-5 text-center shadow-card">
            <h2 className="text-xl font-black">Alles erledigt</h2>
            <p className="mt-2 text-slate-600">Für diesen Filter gibt es gerade keine Spiele.</p>
          </div>
        )}
      </main>
    </>
  );
}
