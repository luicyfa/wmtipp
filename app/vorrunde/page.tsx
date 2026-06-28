import Link from "next/link";
import { redirect } from "next/navigation";
import { Award, CheckCircle2, Sparkles, Trophy } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { requirePlayer } from "@/lib/auth";
import { getBonusPredictions, getMatches, getPlayers, getPlayerPredictions } from "@/lib/data";

const groupCodes = "ABCDEFGHIJKL".split("");

type Row = {
  playerId: string;
  name: string;
  gamePoints: number;
  bonusPoints: number;
  totalPoints: number;
  exactScores: number;
  correctTendencies: number;
  predictedMatches: number;
  correctGroupWinners: number;
  worldChampion: string | null;
};

function rankForRows(rows: Row[], index: number) {
  const row = rows[index];
  const firstSame = rows.findIndex(
    (item) =>
      item.totalPoints === row.totalPoints &&
      item.exactScores === row.exactScores &&
      item.correctTendencies === row.correctTendencies
  );
  return firstSame + 1;
}

export default async function VorrundePage() {
  const player = await requirePlayer();
  if (!player) redirect("/");

  const [matches, players] = await Promise.all([getMatches(), getPlayers()]);
  const activePlayers = players.filter((item) => item.is_active && !item.is_admin);
  const groupMatches = matches.filter((match) => match.round === "Gruppenphase");
  const groupMatchIds = new Set(groupMatches.map((match) => match.id));
  const finishedGroupMatches = groupMatches.filter(
    (match) => match.status === "finished" && match.home_score !== null && match.away_score !== null
  );
  const groupStageComplete = groupMatches.length > 0 && finishedGroupMatches.length === groupMatches.length;

  const rows = await Promise.all(
    activePlayers.map(async (familyPlayer) => {
      const [predictions, bonusPredictions] = await Promise.all([
        getPlayerPredictions(familyPlayer.id),
        getBonusPredictions(familyPlayer.id)
      ]);
      const groupPredictions = predictions.filter((prediction) => groupMatchIds.has(prediction.match_id));
      const groupWinnerPredictions = bonusPredictions.filter((prediction) => prediction.type.startsWith("group_winner_"));
      const worldChampion = bonusPredictions.find((prediction) => prediction.type === "world_champion")?.team?.name ?? null;
      const gamePoints = groupPredictions.reduce((sum, prediction) => sum + prediction.points, 0);
      const bonusPoints = groupWinnerPredictions.reduce((sum, prediction) => sum + prediction.points, 0);

      return {
        playerId: familyPlayer.id,
        name: familyPlayer.name,
        gamePoints,
        bonusPoints,
        totalPoints: gamePoints + bonusPoints,
        exactScores: groupPredictions.filter((prediction) => prediction.exact_score).length,
        correctTendencies: groupPredictions.filter((prediction) => prediction.correct_tendency).length,
        predictedMatches: groupPredictions.length,
        correctGroupWinners: groupWinnerPredictions.filter((prediction) => prediction.points > 0).length,
        worldChampion
      };
    })
  );

  const sortedRows = rows.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.exactScores !== a.exactScores) return b.exactScores - a.exactScores;
    if (b.correctTendencies !== a.correctTendencies) return b.correctTendencies - a.correctTendencies;
    return a.name.localeCompare(b.name, "de");
  });
  const ownRow = sortedRows.find((row) => row.playerId === player.id) ?? null;
  const leader = sortedRows[0] ?? null;
  const totalGroupBonusSlots = activePlayers.length * groupCodes.length;
  const finishedGroupBonusSlots = rows.reduce((sum, row) => sum + row.correctGroupWinners, 0);

  return (
    <>
      <AppHeader player={player} />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <section className="mex-hero rounded-2xl p-5 text-white shadow-card">
          <p className="text-sm font-bold uppercase text-white/65">Vorrunden-Auswertung</p>
          <h1 className="mt-2 text-3xl font-black">So lief die Gruppenphase</h1>
          <p className="mt-3 text-white/75">
            Spielpunkte plus Gruppensieger-Bonus auf einen Blick. Der Weltmeister-Tipp bleibt bis zum Finale offen.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-white/10 p-4">
              <p className="text-sm">Spiele</p>
              <strong className="text-2xl">{finishedGroupMatches.length}/{groupMatches.length}</strong>
            </div>
            <div className="rounded-xl bg-white/10 p-4">
              <p className="text-sm">Dein Platz</p>
              <strong className="text-2xl">{ownRow ? rankForRows(sortedRows, sortedRows.indexOf(ownRow)) : "-"}</strong>
            </div>
            <div className="rounded-xl bg-white/10 p-4">
              <p className="text-sm">Deine Punkte</p>
              <strong className="text-2xl">{ownRow?.totalPoints ?? 0}</strong>
            </div>
            <div className="rounded-xl bg-white/10 p-4">
              <p className="text-sm">Bonus-Treffer</p>
              <strong className="text-2xl">{finishedGroupBonusSlots}/{totalGroupBonusSlots}</strong>
            </div>
          </div>
        </section>

        {!groupStageComplete ? (
          <section className="mt-5 rounded-xl bg-sun/30 p-4 text-amber-950 shadow-card">
            <p className="font-black">Die Vorrunde ist noch nicht komplett ausgewertet.</p>
            <p className="mt-1 text-sm font-semibold">
              Sobald alle Gruppenspiele beendet sind, wird diese Seite zur endgültigen kleinen Vorrunden-Bilanz.
            </p>
          </section>
        ) : null}

        {leader ? (
          <section className="mt-5 rounded-2xl bg-white p-4 shadow-card">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-sun text-amber-950">
                <Trophy className="h-6 w-6" />
              </span>
              <div>
                <p className="text-sm font-black uppercase text-slate-500">Vorrunden-Spitze</p>
                <h2 className="text-2xl font-black">{leader.name}</h2>
                <p className="text-sm font-semibold text-slate-600">
                  {leader.totalPoints} Punkte · {leader.exactScores} exakte Tipps · {leader.correctGroupWinners} Gruppensieger
                </p>
              </div>
            </div>
          </section>
        ) : null}

        <section className="mt-5 grid gap-3 md:grid-cols-2">
          {sortedRows.map((row, index) => {
            const rank = rankForRows(sortedRows, index);
            const isOwn = row.playerId === player.id;

            return (
              <article
                key={row.playerId}
                className={`rounded-2xl p-4 shadow-card ${isOwn ? "bg-pitch text-white" : "bg-white text-ink"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={`text-sm font-black uppercase ${isOwn ? "text-white/70" : "text-slate-500"}`}>
                      Platz {rank}
                    </p>
                    <h3 className="mt-1 text-2xl font-black">{row.name}</h3>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-sm font-black ${isOwn ? "bg-white text-pitch" : "bg-sun text-amber-950"}`}>
                    {row.totalPoints} Pkt
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className={`rounded-xl p-3 ${isOwn ? "bg-white/10" : "bg-slate-50"}`}>
                    <p className={isOwn ? "text-white/70" : "text-slate-500"}>Spielpunkte</p>
                    <strong className="text-xl">{row.gamePoints}</strong>
                  </div>
                  <div className={`rounded-xl p-3 ${isOwn ? "bg-white/10" : "bg-slate-50"}`}>
                    <p className={isOwn ? "text-white/70" : "text-slate-500"}>Bonus</p>
                    <strong className="text-xl">+{row.bonusPoints}</strong>
                  </div>
                  <div className={`rounded-xl p-3 ${isOwn ? "bg-white/10" : "bg-slate-50"}`}>
                    <p className={isOwn ? "text-white/70" : "text-slate-500"}>Exakt</p>
                    <strong>{row.exactScores}</strong>
                  </div>
                  <div className={`rounded-xl p-3 ${isOwn ? "bg-white/10" : "bg-slate-50"}`}>
                    <p className={isOwn ? "text-white/70" : "text-slate-500"}>Tendenz</p>
                    <strong>{row.correctTendencies}</strong>
                  </div>
                </div>
                <div className={`mt-3 rounded-xl p-3 text-sm font-semibold ${isOwn ? "bg-white/10 text-white/80" : "bg-pitch/5 text-slate-700"}`}>
                  <p className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    {row.correctGroupWinners} von 12 Gruppensiegern richtig
                  </p>
                  <p className="mt-1 flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Weltmeister-Tipp: {row.worldChampion ?? "nicht gesetzt"}
                  </p>
                </div>
              </article>
            );
          })}
        </section>

        <section className="mt-5 rounded-xl bg-white p-4 shadow-card">
          <h2 className="flex items-center gap-2 text-xl font-black">
            <Award className="h-5 w-5 text-pitch" />
            Was zählt hier?
          </h2>
          <p className="mt-2 text-sm font-semibold text-slate-600">
            Diese Auswertung zählt nur die Gruppenspiele plus die Gruppensieger-Bonuspunkte. KO-Spiele und der Weltmeister-Bonus kommen danach in die normale Rangliste.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Link href="/gruppen" className="focus-ring rounded-xl bg-pitch px-4 py-3 text-center font-black text-white">
              Gruppen ansehen
            </Link>
            <Link href="/rangliste" className="focus-ring rounded-xl bg-slate-100 px-4 py-3 text-center font-black text-ink">
              Gesamtrangliste
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
