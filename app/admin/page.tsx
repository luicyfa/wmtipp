import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { AdminNav } from "@/components/AdminNav";
import { FeedbackToast } from "@/components/FeedbackToast";
import { SubmitButton } from "@/components/SubmitButton";
import { syncLiveResultsAction } from "@/app/actions";
import { requireAdmin } from "@/lib/auth";
import { getMatches, getPlayers } from "@/lib/data";
import { formatDateTime } from "@/lib/dates";
import { getRankings } from "@/lib/rankings";

function syncFeedback(params: { result?: string; updated?: string; recalculated?: string; linked?: string; apiFixtures?: string }) {
  if (params.result === "live-sync-error") {
    return "Live-Abgleich hat gerade nicht geklappt. Bitte später nochmal versuchen oder Ergebnis manuell eintragen.";
  }
  if (params.result !== "live-sync") return null;
  return `Live-Abgleich fertig: ${params.updated ?? "0"} Spiele aktualisiert, ${params.recalculated ?? "0"} Punkte neu berechnet, ${params.linked ?? "0"} neu verknüpft.`;
}

export default async function AdminPage({
  searchParams
}: {
  searchParams: Promise<{ result?: string; updated?: string; recalculated?: string; linked?: string; apiFixtures?: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect("/dashboard?error=keine-adminrechte");
  const params = await searchParams;
  const [players, matches, rankings] = await Promise.all([getPlayers(true), getMatches(), getRankings()]);
  const finished = matches.filter((match) => match.status === "finished").length;
  const now = new Date();
  const dueResults = matches
    .filter((match) => {
      const kickoff = new Date(match.kickoff_at);
      return kickoff <= now && (match.status !== "finished" || match.home_score === null || match.away_score === null);
    })
    .sort((a, b) => new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime());
  const nextDueResult = dueResults[0] ?? null;

  return (
    <>
      <AppHeader player={admin} />
      <FeedbackToast message={syncFeedback(params)} tone={params.result === "live-sync-error" ? "error" : "success"} />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <AdminNav />
        <h1 className="text-3xl font-black">Admin-Dashboard</h1>
        <section className="mex-hero mt-5 rounded-2xl p-5 text-white shadow-card">
          <p className="text-sm font-black uppercase text-white/65">Turnierleitung</p>
          <h2 className="mt-2 text-3xl font-black">
            {dueResults.length ? `${dueResults.length} Ergebnisse fehlen` : "Alles aktuell"}
          </h2>
          {nextDueResult ? (
            <>
              <p className="mt-3 text-white/75">
                Als nächstes: <strong>{nextDueResult.home_team?.name ?? nextDueResult.home_team_label}</strong> gegen{" "}
                <strong>{nextDueResult.away_team?.name ?? nextDueResult.away_team_label}</strong>
                {" · "}
                {formatDateTime(nextDueResult.kickoff_at)}
              </p>
              <Link
                href={`/admin/spiele?filter=faellig#match-${nextDueResult.id}`}
                className="focus-ring mt-5 inline-flex w-full justify-center rounded-xl bg-sun px-5 py-4 text-center font-black text-amber-950 sm:w-auto"
              >
                Nächstes Ergebnis eintragen
              </Link>
            </>
          ) : (
            <p className="mt-3 text-white/75">Aktuell wartet kein begonnenes Spiel auf ein Ergebnis.</p>
          )}
        </section>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <form action={syncLiveResultsAction}>
            <input type="hidden" name="returnTo" value="/admin" />
            <SubmitButton pendingText="Aktualisiert..." className="focus-ring w-full rounded-xl bg-sun px-5 py-4 text-center font-black text-amber-950 shadow-card">
              Live-Ergebnisse aktualisieren
            </SubmitButton>
          </form>
          <Link href="/admin/spiele?filter=faellig" className="focus-ring rounded-xl bg-pitch px-5 py-4 text-center font-black text-white shadow-card">
            Ergebnisse verwalten
          </Link>
          <Link href="/admin/teilnehmer" className="focus-ring rounded-xl bg-white px-5 py-4 text-center font-black text-pitch shadow-card">
            Teilnehmer verwalten
          </Link>
          <Link href="/admin/bonus" className="focus-ring rounded-xl bg-white px-5 py-4 text-center font-black text-pitch shadow-card">
            Bonus auswerten
          </Link>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-white p-4 shadow-card"><p>Teilnehmer</p><strong className="text-3xl">{players.length}</strong></div>
          <div className="rounded-xl bg-white p-4 shadow-card"><p>Spiele</p><strong className="text-3xl">{matches.length}</strong></div>
          <div className="rounded-xl bg-white p-4 shadow-card"><p>Beendet</p><strong className="text-3xl">{finished}</strong></div>
        </div>
        <section className="mt-6 rounded-xl bg-white p-4 shadow-card">
          <h2 className="font-black">Aktueller Spitzenplatz</h2>
          <p className="mt-2 text-lg">{rankings[0] ? `${rankings[0].name} mit ${rankings[0].total_points} Punkten` : "Noch keine Punkte"}</p>
        </section>
      </main>
    </>
  );
}
