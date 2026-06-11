import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, Calendar, CheckCircle2, Medal, PlusSquare, Trophy } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { MatchCard } from "@/components/MatchCard";
import { getBonusPredictions, getMatches, getPlayerPredictions } from "@/lib/data";
import { requirePlayer } from "@/lib/auth";
import { getRankings, rankForPlayer } from "@/lib/rankings";
import { addDays, startOfLocalDay } from "@/lib/dates";
import { isPredictionLocked } from "@/lib/scoring";

export default async function DashboardPage() {
  const player = await requirePlayer();
  if (!player) redirect("/");
  if (player.is_admin) redirect("/admin");

  const [matches, predictions, rankings, bonusPredictions] = await Promise.all([
    getMatches(),
    getPlayerPredictions(player.id),
    getRankings(),
    getBonusPredictions(player.id)
  ]);
  const predictionMap = new Map(predictions.map((prediction) => [prediction.match_id, prediction]));
  const today = startOfLocalDay();
  const tomorrow = addDays(today, 1);
  const todaysMatches = matches.filter((match) => {
    const kickoff = new Date(match.kickoff_at);
    return kickoff >= today && kickoff < tomorrow;
  });
  const missing = matches.filter((match) => !predictionMap.has(match.id) && !isPredictionLocked(match.kickoff_at));
  const rank = rankForPlayer(rankings, player.id);
  const own = rankings.find((row) => row.player_id === player.id);
  const nextMissing = missing[0] ?? null;
  const progress = matches.length ? Math.round(((matches.length - missing.length) / matches.length) * 100) : 100;
  const worldChampionPrediction = bonusPredictions.find((item) => item.type === "world_champion") ?? null;
  const groupWinnerPredictions = bonusPredictions.filter((item) => item.type.startsWith("group_winner_"));
  const missingBonusTips = (worldChampionPrediction ? 0 : 1) + Math.max(0, 12 - groupWinnerPredictions.length);
  const primaryAction = nextMissing
    ? {
        eyebrow: "Jetzt dran",
        title: "Offene Tipps erledigen",
        body: `${nextMissing.home_team?.name ?? nextMissing.home_team_label} gegen ${nextMissing.away_team?.name ?? nextMissing.away_team_label}`,
        meta: `Noch ${missing.length} Spiele offen`,
        href: "/tippen",
        label: "Los tippen",
        secondaryHref: `/spiele/${nextMissing.id}`,
        secondaryLabel: "Nur dieses Spiel"
      }
    : missingBonusTips
      ? {
          eyebrow: "Bonus fehlt",
          title: "Bonus-Tipps erledigen",
          body: "Weltmeister und Gruppensieger bringen Extra-Punkte.",
          meta: `Noch ${missingBonusTips} Bonus-Tipps offen`,
          href: "/bonus",
          label: "Bonus tippen",
          secondaryHref: "/regeln",
          secondaryLabel: "Punkte ansehen"
        }
      : {
          eyebrow: "Alles erledigt",
          title: "Du bist bereit",
          body: "Alle aktuell möglichen Tipps sind gespeichert.",
          meta: "Zeit für den Blick auf die Rangliste",
          href: "/rangliste",
          label: "Rangliste ansehen",
          secondaryHref: "/gruppen",
          secondaryLabel: "Gruppen ansehen"
        };

  return (
    <>
      <AppHeader player={player} />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <section className="mex-hero rounded-2xl p-5 text-white shadow-card">
          <p className="text-sm font-semibold text-white/70">Hallo {player.name}</p>
          <h1 className="mt-1 text-3xl font-black">Dein WM-Stand</h1>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/10 p-4"><p className="text-sm">Rang</p><strong className="text-3xl">{rank ?? "-"}</strong></div>
            <div className="rounded-xl bg-white/10 p-4"><p className="text-sm">Punkte</p><strong className="text-3xl">{own?.total_points ?? 0}</strong></div>
          </div>
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-sm font-semibold text-white/75">
              <span>{matches.length - missing.length} von {matches.length} Spielen erledigt</span>
              <span>{progress}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-sun" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </section>

        <section className={`mt-5 rounded-2xl p-5 shadow-card ${nextMissing || missingBonusTips ? "bg-sun text-amber-950" : "bg-pitch text-white"}`}>
          <span className="flex items-center gap-2 text-sm font-black uppercase tracking-wide">
            {nextMissing || missingBonusTips ? <AlertCircle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
            {primaryAction.eyebrow}
          </span>
          <h2 className="mt-2 text-3xl font-black">{primaryAction.title}</h2>
          <span className="mt-3 block text-xl font-black">{primaryAction.body}</span>
          <span className="mt-1 block text-sm font-semibold">{primaryAction.meta}</span>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Link
              href={primaryAction.href}
              className={`focus-ring rounded-xl px-5 py-4 text-center text-lg font-black ${nextMissing || missingBonusTips ? "bg-amber-950 text-white" : "bg-white text-pitch"}`}
            >
              {primaryAction.label}
            </Link>
            <Link
              href={primaryAction.secondaryHref}
              className={`focus-ring rounded-xl px-4 py-3 text-center font-black ${nextMissing || missingBonusTips ? "bg-white/70 text-amber-950" : "bg-white/10 text-white"}`}
            >
              {primaryAction.secondaryLabel}
            </Link>
          </div>
        </section>

        <section className="mt-6 rounded-xl bg-white p-4 shadow-card">
          <h2 className="flex items-center gap-2 text-xl font-black">
            <Trophy className="h-5 w-5 text-sun" />
            Bonus-Tipps
          </h2>
          {worldChampionPrediction?.team && groupWinnerPredictions.length === 12 ? (
            <p className="mt-2 text-slate-700">
              Alles erledigt. Weltmeister: <strong>{worldChampionPrediction.team.name}</strong>, Gruppensieger: <strong>12 von 12</strong>.
            </p>
          ) : (
            <div className="mt-3 rounded-xl bg-sun/30 p-4 text-amber-950">
              <p className="font-black">Dir fehlen noch {missingBonusTips} Bonus-Tipps.</p>
              <p className="mt-1 text-sm font-semibold">
                Weltmeister und Gruppensieger bringen Extra-Punkte.
              </p>
              <Link href="/bonus" className="focus-ring mt-3 inline-flex rounded-xl bg-amber-950 px-4 py-3 font-black text-white">
                Bonus-Tipps erledigen
              </Link>
            </div>
          )}
        </section>

        <section className="mt-6">
          <h2 className="mb-3 flex items-center gap-2 text-xl font-black"><Calendar className="h-5 w-5 text-pitch" />Heutige Spiele</h2>
          {todaysMatches.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {todaysMatches.map((match) => (
                <MatchCard key={match.id} match={match} prediction={predictionMap.get(match.id)} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-white p-4 text-slate-600 shadow-card">Heute stehen keine Spiele an.</div>
          )}
        </section>

        <section className="mt-6 rounded-xl bg-white p-4 shadow-card">
          <h2 className="mb-3 flex items-center gap-2 text-xl font-black"><Medal className="h-5 w-5 text-sun" />Top 5</h2>
          <div className="space-y-2">
            {rankings.slice(0, 5).map((row, index) => (
              <div key={row.player_id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="font-bold">{index < 3 ? `Top ${index + 1}` : `${index + 1}.`} {row.name}</span>
                <span>{row.total_points} Punkte</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-xl bg-white p-4 shadow-card">
          <h2 className="flex items-center gap-2 font-black"><PlusSquare className="h-5 w-5 text-pitch" />Als App speichern</h2>
          <div className="mt-3 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
            <div className="rounded-xl bg-pitch/10 p-3">
              <p className="font-black text-pitch">iPhone</p>
              <p className="mt-1 font-semibold">
                In Safari oder Chrome teilen, dann „Zum Home-Bildschirm“ auswählen und „Hinzufügen“ tippen.
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="font-black text-ink">Android</p>
              <p className="mt-1 font-semibold">
                In Chrome oben rechts auf die drei Punkte tippen, dann „Zum Startbildschirm hinzufügen“ auswählen.
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs font-semibold text-slate-500">
            Danach startet das Tippspiel direkt vom Handy-Startbildschirm.
          </p>
        </section>
      </main>
    </>
  );
}
