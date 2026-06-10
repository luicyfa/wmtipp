import { redirect } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { requirePlayer } from "@/lib/auth";
import { getMatches, getPlayerPredictions } from "@/lib/data";
import { formatDateTime } from "@/lib/dates";
import { isPredictionLocked } from "@/lib/scoring";

export default async function MyPredictionsPage() {
  const player = await requirePlayer();
  if (!player) redirect("/");
  const [matches, predictions] = await Promise.all([getMatches(), getPlayerPredictions(player.id)]);
  const predictionMap = new Map(predictions.map((prediction) => [prediction.match_id, prediction]));

  return (
    <>
      <AppHeader player={player} />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="text-3xl font-black">Meine Tipps</h1>
        <div className="mt-5 space-y-3">
          {matches.map((match) => {
            const prediction = predictionMap.get(match.id);
            const status = match.status === "finished" ? "evaluated" : isPredictionLocked(match.kickoff_at) ? "live" : prediction ? "predicted" : "missing";
            return (
              <Link key={match.id} href={`/spiele/${match.id}`} className="flex items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-card">
                <div>
                  <p className="text-xs font-bold uppercase text-pitch">Spiel {match.match_number ?? "-"} · {formatDateTime(match.kickoff_at)}</p>
                  <h2 className="font-black">{match.home_team?.name ?? match.home_team_label} - {match.away_team?.name ?? match.away_team_label}</h2>
                  <p className="mt-1 text-sm text-slate-600">Tipp: {prediction ? `${prediction.home_score}:${prediction.away_score}` : "Offen"}{match.status === "finished" ? ` · ${prediction?.points ?? 0} Punkte` : ""}</p>
                </div>
                <StatusBadge status={status} />
              </Link>
            );
          })}
        </div>
      </main>
    </>
  );
}
