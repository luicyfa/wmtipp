import Link from "next/link";
import { redirect } from "next/navigation";
import { PredictionForm } from "@/components/PredictionForm";
import { AppHeader } from "@/components/AppHeader";
import { FeedbackToast } from "@/components/FeedbackToast";
import { StatusBadge } from "@/components/StatusBadge";
import { requirePlayer } from "@/lib/auth";
import { getMatch, getMatches, getPlayerPredictions, getPrediction, getVisiblePredictions } from "@/lib/data";
import { formatDateTime } from "@/lib/dates";
import { isPredictionLocked } from "@/lib/scoring";

function teamName(match: Awaited<ReturnType<typeof getMatch>>, side: "home" | "away") {
  const team = side === "home" ? match.home_team : match.away_team;
  const label = side === "home" ? match.home_team_label : match.away_team_label;
  return team?.name ?? label ?? "Offen";
}

export default async function MatchDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string; mode?: string; home?: string; away?: string }> }) {
  const player = await requirePlayer();
  if (!player) redirect("/");
  const { id } = await params;
  const query = await searchParams;
  const [match, prediction, matches, predictions] = await Promise.all([
    getMatch(id),
    getPrediction(player.id, id),
    getMatches(),
    getPlayerPredictions(player.id)
  ]);
  const locked = isPredictionLocked(match.kickoff_at);
  const visiblePredictions = locked ? await getVisiblePredictions(id) : [];
  const predictionMap = new Map(predictions.map((item) => [item.match_id, item]));
  const nextOpen = matches.find((item) => !predictionMap.has(item.id) && !isPredictionLocked(item.kickoff_at) && item.id !== id);
  const guidedMode = query.mode === "tippen";
  const savedHomeScore = query.home ?? prediction?.home_score;
  const savedAwayScore = query.away ?? prediction?.away_score;
  const savedText =
    query.saved && savedHomeScore !== undefined && savedAwayScore !== undefined
      ? `Tipp gespeichert: ${teamName(match, "home")} ${savedHomeScore}:${savedAwayScore} ${teamName(match, "away")}.`
      : query.saved
        ? "Tipp gespeichert."
        : null;
  const deadlineError = "Dieses Spiel hat schon begonnen. Dein Tipp ist jetzt gesperrt.";

  return (
    <>
      <AppHeader player={player} />
      <FeedbackToast
        message={savedText ? `${savedText}${guidedMode ? " Weiter geht's." : ""}` : query.error ? deadlineError : null}
        tone={query.error ? "error" : "success"}
      />
      <main className="mx-auto max-w-3xl px-4 py-6">
        {query.saved && !guidedMode ? (
          <div className="mb-4 rounded-xl bg-pitch/10 px-4 py-3 font-semibold text-pitch">
            {savedText}
            {nextOpen ? (
              <Link href={`/spiele/${nextOpen.id}`} className="mt-2 block text-sm font-black underline">
                Nächstes offenes Spiel tippen
              </Link>
            ) : null}
          </div>
        ) : null}
        {query.error ? <p className="mb-4 rounded-xl bg-coral/10 px-4 py-3 font-semibold text-coral">{deadlineError}</p> : null}
        {guidedMode ? (
          <div className="mb-4 rounded-xl bg-sun/30 px-4 py-3 font-bold text-amber-950">
            Tipp-Modus: Speichern bringt dich automatisch zum nächsten offenen Spiel.
          </div>
        ) : null}
        <section className="rounded-2xl bg-ink p-5 text-white shadow-card">
          <div className="flex items-center justify-between gap-3">
            <p className="font-bold text-white/70">Spiel {match.match_number ?? "-"} · {match.round}</p>
            <StatusBadge status={match.status} />
          </div>
          <h1 className="mt-4 text-3xl font-black">{teamName(match, "home")} gegen {teamName(match, "away")}</h1>
          <p className="mt-2 text-white/75">{formatDateTime(match.kickoff_at)}{match.venue ? ` · ${match.venue}` : ""}</p>
          {match.home_score !== null && match.away_score !== null ? (
            <p className="mt-5 text-5xl font-black">{match.home_score}:{match.away_score}</p>
          ) : null}
        </section>

        <div className="mt-5">
          <PredictionForm match={match} prediction={prediction} mode={guidedMode ? "tippen" : undefined} />
        </div>

        {!query.saved && nextOpen && !guidedMode ? (
          <Link href={`/spiele/${nextOpen.id}`} className="mt-5 block rounded-xl bg-white p-4 font-bold text-pitch shadow-card">
            Nächstes offenes Spiel: {teamName(nextOpen, "home")} gegen {teamName(nextOpen, "away")}
          </Link>
        ) : null}

        {prediction && match.status === "finished" ? (
          <section className="mt-5 rounded-xl bg-white p-4 shadow-card">
            <h2 className="font-black">Deine Auswertung</h2>
            <p className="mt-2 text-3xl font-black text-pitch">{prediction.points} Punkte</p>
          </section>
        ) : null}

        {locked ? (
          <section className="mt-5 rounded-xl bg-white p-4 shadow-card">
            <h2 className="mb-3 font-black">Tipps der Familie</h2>
            <div className="space-y-2">
              {visiblePredictions.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <span className="font-bold">{item.player?.name}</span>
                  <span>{item.home_score}:{item.away_score}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </>
  );
}
