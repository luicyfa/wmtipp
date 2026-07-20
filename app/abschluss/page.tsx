import Link from "next/link";
import { redirect } from "next/navigation";
import { Award, Medal, Sparkles, Target, Trophy } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { RankingTable } from "@/components/RankingTable";
import { requirePlayer } from "@/lib/auth";
import { getFamilyBonusPredictions, getMatches, getPlayers } from "@/lib/data";
import { getRankings, rankForPlayer, rankForRow } from "@/lib/rankings";
import type { Match } from "@/lib/types";

const groupCodes = "ABCDEFGHIJKL".split("");

type FinalRow = {
  playerId: string;
  name: string;
  rank: number;
  totalPoints: number;
  exactScores: number;
  correctTendencies: number;
  predictedMatches: number;
  groupWinnerPoints: number;
  correctGroupWinners: number;
  worldChampionPoints: number;
  worldChampionTip: string | null;
};

function getChampionName(finalMatch: Match | undefined) {
  if (!finalMatch?.winner_team_id) return null;
  if (finalMatch.winner_team_id === finalMatch.home_team_id) {
    return finalMatch.home_team?.name ?? finalMatch.home_team_label;
  }
  if (finalMatch.winner_team_id === finalMatch.away_team_id) {
    return finalMatch.away_team?.name ?? finalMatch.away_team_label;
  }
  return null;
}

export default async function AbschlussPage() {
  const player = await requirePlayer();
  if (!player) redirect("/");

  const [matches, players, rankings, familyBonusPredictions] = await Promise.all([
    getMatches(),
    getPlayers(),
    getRankings(),
    getFamilyBonusPredictions()
  ]);

  const activePlayers = players.filter((item) => item.is_active && !item.is_admin);
  const finalMatch = matches.find((match) => match.round === "Finale" && match.status === "finished");
  const worldChampionName = getChampionName(finalMatch);
  const finishedMatches = matches.filter((match) => match.status === "finished" && match.home_score !== null && match.away_score !== null);
  const tournamentComplete = matches.length > 0 && finishedMatches.length === matches.length && Boolean(worldChampionName);
  const worldChampionFamilyTips = familyBonusPredictions.filter((tip) => tip.type === "world_champion");
  const championTipByPlayer = new Map(worldChampionFamilyTips.map((tip) => [tip.player_id, tip]));
  const correctChampionTips = worldChampionFamilyTips.filter((tip) => tip.points > 0);

  const bonusByPlayer = activePlayers.map((familyPlayer) => {
    const bonusPredictions = familyBonusPredictions.filter((tip) => tip.player_id === familyPlayer.id);
    const groupWinnerPredictions = bonusPredictions.filter((tip) => tip.type.startsWith("group_winner_"));
    const worldChampionTip = bonusPredictions.find((tip) => tip.type === "world_champion") ?? null;

    return {
      playerId: familyPlayer.id,
      groupWinnerPoints: groupWinnerPredictions.reduce((sum, tip) => sum + tip.points, 0),
      correctGroupWinners: groupWinnerPredictions.filter((tip) => tip.points > 0).length,
      worldChampionPoints: worldChampionTip?.points ?? 0,
      worldChampionTip: worldChampionTip?.team?.name ?? null
    };
  });
  const bonusMap = new Map(bonusByPlayer.map((row) => [row.playerId, row]));

  const finalRows: FinalRow[] = rankings
    .map((ranking, index) => {
      const bonus = bonusMap.get(ranking.player_id);
      return {
        playerId: ranking.player_id,
        name: ranking.name,
        rank: rankForRow(rankings, index) ?? index + 1,
        totalPoints: ranking.total_points,
        exactScores: ranking.exact_scores,
        correctTendencies: ranking.correct_tendencies,
        predictedMatches: ranking.predicted_matches,
        groupWinnerPoints: bonus?.groupWinnerPoints ?? 0,
        correctGroupWinners: bonus?.correctGroupWinners ?? 0,
        worldChampionPoints: bonus?.worldChampionPoints ?? 0,
        worldChampionTip: bonus?.worldChampionTip ?? null
      };
    });

  const winner = finalRows[0] ?? null;
  const ownRank = rankForPlayer(rankings, player.id);
  const ownRow = finalRows.find((row) => row.playerId === player.id) ?? null;
  const exactChampion = finalRows.reduce<FinalRow | null>(
    (best, row) => (!best || row.exactScores > best.exactScores ? row : best),
    null
  );
  const groupChampion = finalRows.reduce<FinalRow | null>(
    (best, row) => (!best || row.correctGroupWinners > best.correctGroupWinners ? row : best),
    null
  );

  return (
    <>
      <AppHeader player={player} />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <section className="mex-hero rounded-2xl p-5 text-white shadow-card">
          <p className="text-sm font-black uppercase text-white/65">Abschluss-Auswertung</p>
          <h1 className="mt-2 text-3xl font-black">Die WM-Bilanz der Familie</h1>
          <p className="mt-3 max-w-2xl text-white/75">
            Endstand, Bonuspunkte und die Weltmeistertipps auf einer Seite.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-white/10 p-4">
              <p className="text-sm">Spiele fertig</p>
              <strong className="text-2xl">{finishedMatches.length}/{matches.length}</strong>
            </div>
            <div className="rounded-xl bg-white/10 p-4">
              <p className="text-sm">Weltmeister</p>
              <strong className="text-2xl">{worldChampionName ?? "-"}</strong>
            </div>
            <div className="rounded-xl bg-white/10 p-4">
              <p className="text-sm">Dein Platz</p>
              <strong className="text-2xl">{ownRank ?? "-"}</strong>
            </div>
            <div className="rounded-xl bg-white/10 p-4">
              <p className="text-sm">Deine Punkte</p>
              <strong className="text-2xl">{ownRow?.totalPoints ?? 0}</strong>
            </div>
          </div>
        </section>

        {!tournamentComplete ? (
          <section className="mt-5 rounded-xl bg-sun/30 p-4 text-amber-950 shadow-card">
            <p className="font-black">Die Abschluss-Auswertung ist noch nicht komplett.</p>
            <p className="mt-1 text-sm font-semibold">
              Sie wird endgültig, sobald alle Spiele beendet sind und der Weltmeister-Bonus ausgewertet wurde.
            </p>
          </section>
        ) : null}

        {winner ? (
          <section className="mt-5 rounded-2xl bg-sun p-5 text-amber-950 shadow-card">
            <div className="flex items-start gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-amber-950 text-white">
                <Trophy className="h-8 w-8" />
              </span>
              <div>
                <p className="text-sm font-black uppercase">Familiensieger</p>
                <h2 className="mt-1 text-3xl font-black">{winner.name}</h2>
                <p className="mt-1 font-bold">
                  {winner.totalPoints} Punkte · {winner.exactScores} exakte Tipps · {winner.correctTendencies} richtige Tendenzen
                </p>
              </div>
            </div>
          </section>
        ) : null}

        <section className="mt-5 grid gap-3 md:grid-cols-3">
          <article className="rounded-2xl bg-white p-4 shadow-card">
            <p className="flex items-center gap-2 text-sm font-black uppercase text-pitch">
              <Sparkles className="h-5 w-5 text-sun" />
              Weltmeister-Bonus
            </p>
            <h2 className="mt-2 text-2xl font-black">{worldChampionName ?? "Noch offen"}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              {correctChampionTips.length
                ? `${correctChampionTips.length} richtige Tipps mit je 10 Punkten.`
                : "Noch kein richtiger Weltmeistertipp bewertet."}
            </p>
          </article>
          <article className="rounded-2xl bg-white p-4 shadow-card">
            <p className="flex items-center gap-2 text-sm font-black uppercase text-pitch">
              <Target className="h-5 w-5 text-pitch" />
              Exakt-König
            </p>
            <h2 className="mt-2 text-2xl font-black">{exactChampion?.name ?? "-"}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-600">{exactChampion?.exactScores ?? 0} exakte Spieltipps</p>
          </article>
          <article className="rounded-2xl bg-white p-4 shadow-card">
            <p className="flex items-center gap-2 text-sm font-black uppercase text-pitch">
              <Award className="h-5 w-5 text-pitch" />
              Gruppensieger
            </p>
            <h2 className="mt-2 text-2xl font-black">{groupChampion?.name ?? "-"}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              {groupChampion?.correctGroupWinners ?? 0} von {groupCodes.length} richtig
            </p>
          </article>
        </section>

        <section className="mt-5 rounded-2xl bg-white p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">Weltmeistertipps</h2>
              <p className="mt-1 text-sm font-semibold text-slate-600">Wer hatte den richtigen Riecher fürs Finale?</p>
            </div>
            <span className="rounded-full bg-sun px-3 py-1 text-sm font-black text-amber-950">10 Punkte</span>
          </div>
          <div className="space-y-2">
            {activePlayers.map((familyPlayer) => {
              const tip = championTipByPlayer.get(familyPlayer.id);
              const correct = (tip?.points ?? 0) > 0;
              return (
                <div
                  key={familyPlayer.id}
                  className={`flex items-center justify-between gap-3 rounded-xl px-3 py-3 ${
                    correct ? "bg-pitch text-white" : "bg-slate-50 text-ink"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate font-black">{familyPlayer.name}</p>
                    <p className={`text-sm font-semibold ${correct ? "text-white/75" : "text-slate-500"}`}>
                      {tip?.team?.name ?? "Nicht getippt"}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-black ${correct ? "bg-white text-pitch" : "bg-white text-slate-500"}`}>
                    +{tip?.points ?? 0}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-5 rounded-2xl bg-white p-4 shadow-card">
          <h2 className="mb-3 flex items-center gap-2 text-xl font-black">
            <Medal className="h-5 w-5 text-sun" />
            Endrangliste
          </h2>
          <RankingTable rows={rankings} currentPlayerId={player.is_admin ? undefined : player.id} />
        </section>

        <section className="mt-5 rounded-2xl bg-white p-4 shadow-card">
          <h2 className="text-xl font-black">Punkte-Aufschlüsselung</h2>
          <div className="mt-3 overflow-hidden rounded-xl border border-slate-100">
            <div className="grid grid-cols-[1fr_4rem_4rem_4rem] bg-pitch px-3 py-2 text-xs font-black uppercase text-white">
              <span>Name</span>
              <span className="text-right">Total</span>
              <span className="text-right">Gruppe</span>
              <span className="text-right">WM</span>
            </div>
            <div className="divide-y divide-slate-100">
              {finalRows.map((row) => (
                <div key={row.playerId} className={`grid grid-cols-[1fr_4rem_4rem_4rem] items-center px-3 py-3 text-sm ${row.playerId === player.id ? "bg-sun/25 font-bold" : ""}`}>
                  <span className="min-w-0 truncate">
                    Platz {row.rank} · {row.name}
                  </span>
                  <span className="text-right font-black">{row.totalPoints}</span>
                  <span className="text-right">+{row.groupWinnerPoints}</span>
                  <span className="text-right">+{row.worldChampionPoints}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-500">
            Gruppe steht für Gruppensieger-Bonus. WM steht für den Weltmeister-Bonus.
          </p>
        </section>

        <section className="mt-5 grid gap-2 sm:grid-cols-3">
          <Link href="/rangliste" className="focus-ring rounded-xl bg-pitch px-4 py-3 text-center font-black text-white">
            Rangliste
          </Link>
          <Link href="/vorrunde" className="focus-ring rounded-xl bg-white px-4 py-3 text-center font-black text-ink shadow-card">
            Vorrunde
          </Link>
          <Link href="/finalrunde" className="focus-ring rounded-xl bg-white px-4 py-3 text-center font-black text-ink shadow-card">
            Finalrunde
          </Link>
        </section>
      </main>
    </>
  );
}
