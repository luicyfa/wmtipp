import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock3, LockKeyhole, Trophy } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
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
            Gewertet wird das Ergebnis nach 90 Minuten. Für die richtige Mannschaft, die weiterkommt, gibt es einen Zusatzpunkt.
          </p>
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
                <div className="grid gap-3 md:grid-cols-2">
                  {roundMatches.map((match) => {
                    const released = isMatchPredictionOpen(match);
                    const locked = isPredictionLocked(match.kickoff_at);
                    const prediction = predictionMap.get(match.id);
                    const card = (
                      <article className={`rounded-xl p-4 shadow-card ${released ? "bg-white" : "bg-slate-100 text-slate-500"}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-black uppercase text-pitch">
                              Spiel {match.match_number ?? "-"} · {formatDateTime(match.kickoff_at)}
                            </p>
                            <h3 className="mt-1 text-lg font-black text-ink">
                              {teamName(match, "home")} gegen {teamName(match, "away")}
                            </h3>
                          </div>
                          {prediction ? (
                            <CheckCircle2 className="h-5 w-5 shrink-0 text-pitch" />
                          ) : released && !locked ? (
                            <Clock3 className="h-5 w-5 shrink-0 text-sun" />
                          ) : (
                            <LockKeyhole className="h-5 w-5 shrink-0 text-slate-400" />
                          )}
                        </div>
                        <p className="mt-3 text-sm font-semibold">
                          {prediction
                            ? `Dein Tipp: ${prediction.home_score}:${prediction.away_score}`
                            : released && !locked
                              ? "Jetzt tippbar"
                              : released
                                ? "Tippfrist beendet"
                                : "Wartet auf Mannschaften oder Sieger"}
                        </p>
                      </article>
                    );

                    return released ? (
                      <Link key={match.id} href={`/spiele/${match.id}`} className="focus-ring block rounded-xl">
                        {card}
                      </Link>
                    ) : (
                      <div key={match.id}>{card}</div>
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
