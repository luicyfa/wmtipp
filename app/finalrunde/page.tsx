import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, CheckCircle2, Clock3, LockKeyhole, MapPin, Trophy } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { requirePlayer } from "@/lib/auth";
import { getMatches, getPlayerPredictions } from "@/lib/data";
import { formatDateTime } from "@/lib/dates";
import { isMatchPredictionOpen, knockoutRounds } from "@/lib/knockout";
import { isPredictionLocked } from "@/lib/scoring";

type MatchItem = Awaited<ReturnType<typeof getMatches>>[number];

function teamName(match: MatchItem, side: "home" | "away") {
  const team = side === "home" ? match.home_team : match.away_team;
  const label = side === "home" ? match.home_team_label : match.away_team_label;
  return team?.name ?? label ?? "Noch offen";
}

function resultLabel(match: MatchItem) {
  if (match.home_score === null || match.away_score === null) return null;
  if (match.result_duration === "PENALTY_SHOOTOUT" && match.penalty_home_score !== null && match.penalty_away_score !== null) {
    return `${match.home_score}:${match.away_score} · i.E. ${match.penalty_home_score}:${match.penalty_away_score}`;
  }
  if (match.result_duration === "EXTRA_TIME" && match.extra_time_home_score !== null && match.extra_time_away_score !== null) {
    return `${match.home_score}:${match.away_score} · n.V. ${match.extra_time_home_score}:${match.extra_time_away_score}`;
  }
  return `${match.home_score}:${match.away_score}`;
}

export default async function FinalRoundPage() {
  const player = await requirePlayer();
  if (!player) redirect("/");
  if (player.is_admin) redirect("/admin/spiele?filter=alle");

  const [matches, predictions] = await Promise.all([getMatches(), getPlayerPredictions(player.id)]);
  const predictionMap = new Map(predictions.map((prediction) => [prediction.match_id, prediction]));
  const knockoutMatches = matches.filter((match) => match.round !== "Gruppenphase");
  const openMatches = knockoutMatches.filter(
    (match) => isMatchPredictionOpen(match) && !isPredictionLocked(match.kickoff_at)
  );
  const missingOpen = openMatches.filter((match) => !predictionMap.has(match.id)).length;
  const currentRound =
    knockoutRounds.find((round) =>
      knockoutMatches.some(
        (match) => match.round === round && (isMatchPredictionOpen(match) || match.status !== "scheduled")
      )
    ) ?? "Sechzehntelfinale";

  return (
    <>
      <AppHeader player={player} />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <section className="mex-hero rounded-2xl p-5 text-white shadow-card">
          <p className="text-sm font-black uppercase text-white/65">Finalrunde</p>
          <h1 className="mt-2 text-3xl font-black">
            {openMatches.length ? `${missingOpen} K.-o.-Tipps offen` : "Die Finalrunde nimmt Form an"}
          </h1>
          <p className="mt-3 text-white/75">
            Alle K.-o.-Spiele auf einen Blick: wer gegen wen spielt, wann Anstoß ist und ob dein Tipp schon drin ist.
          </p>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-xl bg-white/10 p-3">
              <p className="text-white/65">Tippbar</p>
              <strong className="text-2xl">{openMatches.length}</strong>
            </div>
            <div className="rounded-xl bg-white/10 p-3">
              <p className="text-white/65">Offen</p>
              <strong className="text-2xl">{missingOpen}</strong>
            </div>
            <div className="rounded-xl bg-white/10 p-3">
              <p className="text-white/65">Gesamt</p>
              <strong className="text-2xl">{knockoutMatches.length}</strong>
            </div>
          </div>
          {missingOpen ? (
            <Link
              href="/tippen"
              className="focus-ring mt-5 inline-flex w-full justify-center rounded-xl bg-sun px-5 py-4 font-black text-amber-950 sm:w-auto"
            >
              Offene Finalrunden-Tipps erledigen
            </Link>
          ) : null}
        </section>

        <div className="mt-6 space-y-6">
          {knockoutRounds.map((round) => {
            const roundMatches = knockoutMatches.filter((match) => match.round === round);
            if (!roundMatches.length) return null;
            const isCurrent = round === currentRound;

            return (
              <section key={round}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="flex items-center gap-2 text-xl font-black">
                    {round === "Finale" ? <Trophy className="h-5 w-5 text-sun" /> : null}
                    {round}
                  </h2>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${isCurrent ? "bg-pitch text-white" : "bg-slate-100 text-slate-600"}`}>
                    {isCurrent ? "Aktuell" : `${roundMatches.length} Spiele`}
                  </span>
                </div>
                <div className="overflow-hidden rounded-2xl bg-white shadow-card">
                  {roundMatches.map((match) => {
                    const released = isMatchPredictionOpen(match);
                    const locked = isPredictionLocked(match.kickoff_at);
                    const prediction = predictionMap.get(match.id);
                    const result = resultLabel(match);
                    const status =
                      match.status === "finished" ? "finished" : prediction ? "predicted" : locked ? "live" : "missing";
                    const winner =
                      match.winner_team_id === match.home_team_id
                        ? teamName(match, "home")
                        : match.winner_team_id === match.away_team_id
                          ? teamName(match, "away")
                          : null;
                    const content = (
                      <article className={`border-b border-slate-100 p-4 last:border-b-0 ${released ? "bg-white" : "bg-slate-50"}`}>
                        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase text-pitch">
                              <span>Spiel {match.match_number ?? "-"}</span>
                              <span className="inline-flex items-center gap-1 text-slate-500">
                                <CalendarDays className="h-3.5 w-3.5" />
                                {formatDateTime(match.kickoff_at)}
                              </span>
                            </div>
                            <h3 className={`mt-2 text-lg font-black ${released ? "text-ink" : "text-slate-500"}`}>
                              {teamName(match, "home")} <span className="text-slate-400">gegen</span> {teamName(match, "away")}
                            </h3>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                              {match.venue ? (
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5" />
                                  {match.venue}
                                </span>
                              ) : null}
                              {!released ? <span>Wartet noch auf die Mannschaften</span> : null}
                              {winner ? <span>Weiter: {winner}</span> : null}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 md:min-w-64">
                            <div className="rounded-xl bg-slate-50 px-3 py-2">
                              <p className="text-xs font-bold text-slate-500">Ergebnis</p>
                              <strong className="text-lg text-ink">{result ?? "-"}</strong>
                            </div>
                            <div className="rounded-xl bg-slate-50 px-3 py-2">
                              <p className="text-xs font-bold text-slate-500">Dein Tipp</p>
                              <strong className="text-lg text-ink">{prediction ? `${prediction.home_score}:${prediction.away_score}` : "-"}</strong>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          <StatusBadge status={status} />
                          <span className="inline-flex items-center gap-1 text-xs font-black text-slate-500">
                            {prediction ? (
                              <>
                                <CheckCircle2 className="h-4 w-4 text-pitch" />
                                Tipp gespeichert
                              </>
                            ) : released && !locked ? (
                              <>
                                <Clock3 className="h-4 w-4 text-sun" />
                                Jetzt tippbar
                              </>
                            ) : (
                              <>
                                <LockKeyhole className="h-4 w-4 text-slate-400" />
                                {released ? "Gesperrt" : "Noch nicht tippbar"}
                              </>
                            )}
                          </span>
                        </div>
                      </article>
                    );

                    return released ? (
                      <Link key={match.id} href={`/spiele/${match.id}`} className="focus-ring block">
                        {content}
                      </Link>
                    ) : (
                      <div key={match.id}>{content}</div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </>
  );
}
