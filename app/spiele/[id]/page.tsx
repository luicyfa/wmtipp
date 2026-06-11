import Link from "next/link";
import { redirect } from "next/navigation";
import { Trophy } from "lucide-react";
import { PredictionForm } from "@/components/PredictionForm";
import { AppHeader } from "@/components/AppHeader";
import { FeedbackToast } from "@/components/FeedbackToast";
import { StatusBadge } from "@/components/StatusBadge";
import { requirePlayer } from "@/lib/auth";
import { getMatch, getMatches, getPlayerPredictions, getPrediction, getVisiblePredictions } from "@/lib/data";
import { formatDateTime } from "@/lib/dates";
import { isPredictionLocked } from "@/lib/scoring";

type MatchForName = Awaited<ReturnType<typeof getMatch>>;
type VisiblePrediction = Awaited<ReturnType<typeof getVisiblePredictions>>[number];

function teamName(match: MatchForName, side: "home" | "away") {
  const team = side === "home" ? match.home_team : match.away_team;
  const label = side === "home" ? match.home_team_label : match.away_team_label;
  return team?.name ?? label ?? "Offen";
}

function tendencyLabel(homeScore: number, awayScore: number, match: MatchForName) {
  if (homeScore > awayScore) return `${teamName(match, "home")} gewinnt`;
  if (homeScore < awayScore) return `${teamName(match, "away")} gewinnt`;
  return "Unentschieden";
}

function familyTipHighlights(predictions: VisiblePrediction[], match: MatchForName, hasResult: boolean) {
  if (!predictions.length) return [];

  if (hasResult) {
    const exactNames = predictions.filter((item) => item.exact_score).map((item) => item.player?.name ?? "Jemand");
    const tendencyCount = predictions.filter((item) => item.correct_tendency).length;
    const resultLabel = tendencyLabel(match.home_score ?? 0, match.away_score ?? 0, match);
    const highlights = [];

    if (exactNames.length === 1) highlights.push(`${exactNames[0]} lag exakt richtig.`);
    if (exactNames.length > 1) highlights.push(`${exactNames.join(", ")} lagen exakt richtig.`);
    if (!exactNames.length) highlights.push("Niemand hatte das exakte Ergebnis.");
    if (tendencyCount > 0) highlights.push(`${tendencyCount} ${tendencyCount === 1 ? "Person hatte" : "Personen hatten"} die richtige Tendenz: ${resultLabel}.`);

    return highlights;
  }

  const homeWins = predictions.filter((item) => item.home_score > item.away_score).length;
  const draws = predictions.filter((item) => item.home_score === item.away_score).length;
  const awayWins = predictions.filter((item) => item.home_score < item.away_score).length;
  const counts = [
    { count: homeWins, label: `${teamName(match, "home")} gewinnt` },
    { count: draws, label: "Unentschieden" },
    { count: awayWins, label: `${teamName(match, "away")} gewinnt` }
  ].filter((item) => item.count > 0).sort((a, b) => b.count - a.count);

  return counts.map((item) => `${item.count} ${item.count === 1 ? "Tipp sagt" : "Tipps sagen"}: ${item.label}.`);
}

export default async function MatchDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string; mode?: string; home?: string; away?: string; changed?: string }> }) {
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
  const nextOpen = player.is_admin ? null : matches.find((item) => !predictionMap.has(item.id) && !isPredictionLocked(item.kickoff_at) && item.id !== id);
  const guidedMode = query.mode === "tippen";
  const savedHomeScore = query.home ?? prediction?.home_score;
  const savedAwayScore = query.away ?? prediction?.away_score;
  const savedPrefix = query.changed ? "Dein Tipp wurde geändert" : "Tipp gespeichert";
  const savedText =
    query.saved && guidedMode
      ? query.changed ? "Tipp geändert." : "Tipp gespeichert."
      : query.saved && savedHomeScore !== undefined && savedAwayScore !== undefined
      ? `${savedPrefix}: ${teamName(match, "home")} ${savedHomeScore}:${savedAwayScore} ${teamName(match, "away")}.`
      : query.saved
        ? `${savedPrefix}.`
        : null;
  const deadlineError = "Dieses Spiel hat schon begonnen. Dein Tipp ist jetzt gesperrt.";
  const hasResult = match.status === "finished" && match.home_score !== null && match.away_score !== null;
  const tipHighlights = locked ? familyTipHighlights(visiblePredictions, match, hasResult) : [];

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
        <section className="mex-hero rounded-2xl p-5 text-white shadow-card">
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

        {player.is_admin ? (
          <section className="mt-5 rounded-xl bg-white p-4 shadow-card">
            <h2 className="text-lg font-black">Admin-Modus</h2>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              Der Admin nimmt keine Tipps ab. Hier geht es direkt zur Ergebniseingabe und Auswertung.
            </p>
            <Link
              href={`/admin/spiele?filter=alle#match-${match.id}`}
              className="focus-ring mt-4 inline-flex w-full justify-center rounded-xl bg-pitch px-5 py-4 font-black text-white"
            >
              Ergebnis für dieses Spiel eintragen
            </Link>
          </section>
        ) : (
          <div className="mt-5">
            <PredictionForm match={match} prediction={prediction} mode={guidedMode ? "tippen" : undefined} />
          </div>
        )}

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

        <section className="mt-5 rounded-xl bg-white p-4 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-black">Tipps der Familie</h2>
              <p className="mt-1 text-sm font-semibold text-slate-600">
                {locked
                  ? hasResult
                    ? "Alle Tipps und Punkte auf einen Blick."
                    : "Das Spiel hat begonnen. Jetzt darf gemeinsam verglichen werden."
                  : `Bleibt geheim bis zum Anstoß: ${formatDateTime(match.kickoff_at)}.`}
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-black ${locked ? "bg-pitch/10 text-pitch" : "bg-slate-100 text-slate-500"}`}>
              {locked ? `${visiblePredictions.length} Tipps` : "Noch geheim"}
            </span>
          </div>
          {locked ? (
            <div className="mt-4 space-y-2">
              {tipHighlights.length ? (
                <div className="space-y-2 rounded-xl bg-pitch/10 p-3 text-sm font-bold text-pitch">
                  {tipHighlights.map((highlight) => (
                    <p key={highlight}>{highlight}</p>
                  ))}
                </div>
              ) : null}
              {visiblePredictions.length ? visiblePredictions.map((item) => {
                const isOwn = item.player_id === player.id;
                const exact = hasResult && item.exact_score;
                return (
                  <div
                    key={item.id}
                    className={`grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl border px-3 py-3 ${
                      isOwn ? "border-pitch/30 bg-pitch/10" : exact ? "border-amber-200 bg-sun/20" : "border-slate-100 bg-slate-50"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-black text-ink">
                        {item.player?.name ?? "Unbekannt"}
                        {isOwn ? <span className="ml-2 rounded-full bg-pitch px-2 py-0.5 align-middle text-[10px] font-black text-white">Du</span> : null}
                      </p>
                      <p className="mt-0.5 text-xs font-semibold text-slate-500">
                        {exact ? "Exakt richtig" : hasResult && item.correct_tendency ? "Tendenz richtig" : hasResult ? "Ausgewertet" : "Wartet auf Ergebnis"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-ink">{item.home_score}:{item.away_score}</p>
                      <p className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-black ${
                        hasResult ? "bg-white text-pitch" : "bg-white text-slate-500"
                      }`}>
                        {exact ? <Trophy className="h-3 w-3 text-amber-500" /> : null}
                        {hasResult ? `+${item.points}` : "offen"}
                      </p>
                    </div>
                  </div>
                );
              }) : (
                <p className="rounded-xl bg-slate-50 px-3 py-4 text-sm font-semibold text-slate-600">
                  Für dieses Spiel gibt es noch keine Tipps.
                </p>
              )}
            </div>
          ) : (
            <p className="mt-4 rounded-xl bg-slate-50 px-3 py-4 text-sm font-semibold text-slate-600">
              Fair bleibt fair: Vor Spielbeginn sieht jeder nur den eigenen Tipp.
            </p>
          )}
        </section>

      </main>
    </>
  );
}
