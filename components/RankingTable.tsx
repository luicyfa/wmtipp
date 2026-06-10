import { Medal, Trophy } from "lucide-react";
import { clsx } from "clsx";
import type { RankingRow } from "@/lib/types";

export function RankingTable({ rows, currentPlayerId }: { rows: RankingRow[]; currentPlayerId?: string }) {
  return (
    <>
      <div className="space-y-3 md:hidden">
        {rows.map((row, index) => {
          const isCurrent = row.player_id === currentPlayerId;
          return (
            <article
              key={row.player_id}
              className={clsx(
                "rounded-xl bg-white p-4 shadow-card",
                isCurrent && "bg-sun/25 ring-2 ring-sun"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-pitch">
                    {index === 0 ? <Trophy className="h-4 w-4 text-amber-500" /> : null}
                    {index > 0 && index < 3 ? <Medal className="h-4 w-4 text-pitch" /> : null}
                    Platz {index + 1}
                  </p>
                  <h2 className="mt-1 break-words text-xl font-black text-ink">
                    {row.name}
                    {isCurrent ? <span className="ml-2 rounded-full bg-pitch px-2 py-0.5 align-middle text-xs font-black text-white">Du</span> : null}
                  </h2>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-ink">{row.total_points}</p>
                  <p className="text-xs font-bold text-slate-500">Punkte</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
                <div className="rounded-lg bg-slate-50 px-2 py-2">
                  <p className="font-black">{row.exact_scores}</p>
                  <p className="text-xs text-slate-500">Exakt</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-2 py-2">
                  <p className="font-black">{row.correct_tendencies}</p>
                  <p className="text-xs text-slate-500">Tendenz</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-2 py-2">
                  <p className="font-black">{row.open_predictions}</p>
                  <p className="text-xs text-slate-500">Offen</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <div className="hidden overflow-hidden rounded-xl bg-white shadow-card md:block">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-ink text-white">
            <tr>
              <th className="px-4 py-3">Platz</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Punkte</th>
              <th className="px-4 py-3">Exakt</th>
              <th className="px-4 py-3">Tendenz</th>
              <th className="px-4 py-3">Getippt</th>
              <th className="px-4 py-3">Offen</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.player_id} className={clsx("border-b border-slate-100", row.player_id === currentPlayerId && "bg-sun/25 font-bold")}>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-2">
                    {index === 0 ? <Trophy className="h-4 w-4 text-amber-500" /> : null}
                    {index > 0 && index < 3 ? <Medal className="h-4 w-4 text-pitch" /> : null}
                    {index + 1}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {row.name}
                  {row.player_id === currentPlayerId ? <span className="ml-2 rounded-full bg-pitch px-2 py-0.5 text-xs font-black text-white">Du</span> : null}
                </td>
                <td className="px-4 py-3 text-lg font-black">{row.total_points}</td>
                <td className="px-4 py-3">{row.exact_scores}</td>
                <td className="px-4 py-3">{row.correct_tendencies}</td>
                <td className="px-4 py-3">{row.predicted_matches}</td>
                <td className="px-4 py-3">{row.open_predictions}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </>
  );
}
