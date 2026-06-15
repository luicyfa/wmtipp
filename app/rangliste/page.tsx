import { redirect } from "next/navigation";
import { Medal, Trophy } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { RankingTable } from "@/components/RankingTable";
import { requirePlayer } from "@/lib/auth";
import { getRankings, rankForPlayer, rankForRow } from "@/lib/rankings";

export default async function RankingPage() {
  const player = await requirePlayer();
  if (!player) redirect("/");
  const rankings = await getRankings();
  const own = rankings.find((row) => row.player_id === player.id);
  const ownRank = rankForPlayer(rankings, player.id);
  const leader = rankings[0];
  const gapToLeader = own && leader ? Math.max(0, leader.total_points - own.total_points) : 0;
  const topThree = rankings
    .map((row, index) => ({ row, rank: rankForRow(rankings, index) ?? index + 1 }))
    .filter((item) => item.rank <= 3);

  return (
    <>
      <AppHeader player={player} />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="text-3xl font-black">Rangliste</h1>
        <section className="mex-hero mt-5 rounded-2xl p-5 text-white shadow-card">
          <p className="text-sm font-bold uppercase text-white/65">Dein Abstand</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-white/10 p-4">
              <p className="text-sm text-white/70">Dein Platz</p>
              <strong className="text-3xl">{ownRank ?? "-"}</strong>
            </div>
            <div className="rounded-xl bg-white/10 p-4">
              <p className="text-sm text-white/70">Deine Punkte</p>
              <strong className="text-3xl">{own?.total_points ?? 0}</strong>
            </div>
            <div className="rounded-xl bg-white/10 p-4">
              <p className="text-sm text-white/70">Bis Platz 1</p>
              <strong className="text-3xl">{gapToLeader}</strong>
            </div>
          </div>
        </section>
        <section className="mt-5 grid gap-3 md:grid-cols-3">
          {topThree.map(({ row, rank }) => (
            <div key={row.player_id} className={`rounded-xl p-4 shadow-card ${rank === 1 ? "mex-gold-panel text-amber-950 md:-mt-2" : "bg-white"}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-black uppercase tracking-wide">Platz {rank}</span>
                {rank === 1 ? <Trophy className="h-6 w-6" /> : <Medal className="h-6 w-6 text-pitch" />}
              </div>
              <h2 className="mt-3 text-2xl font-black">{row.name}</h2>
              <p className="mt-1 text-sm font-semibold">{row.total_points} Punkte · {row.exact_scores} exakte Tipps</p>
            </div>
          ))}
        </section>
        <div className="mt-5">
          <RankingTable rows={rankings} currentPlayerId={player.id} />
        </div>
      </main>
    </>
  );
}
