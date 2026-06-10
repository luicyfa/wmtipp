import { Medal, Trophy } from "lucide-react";
import { clsx } from "clsx";
import type { RankingRow } from "@/lib/types";

export function RankingTable({ rows, currentPlayerId }: { rows: RankingRow[]; currentPlayerId?: string }) {
  return (
    <>
      <div className="overflow-hidden rounded-xl bg-white shadow-card md:hidden">
        <div className="grid grid-cols-[3.25rem_1fr_4.5rem] bg-pitch px-3 py-2 text-xs font-black uppercase tracking-wide text-white">
          <span>Platz</span>
          <span>Name</span>
          <span className="text-right">Punkte</span>
        </div>
        <div className="divide-y divide-slate-100">
          {rows.map((row, index) => {
            const isCurrent = row.player_id === currentPlayerId;
            return (
              <div
                key={row.player_id}
                className={clsx(
                  "grid grid-cols-[3.25rem_1fr_4.5rem] items-center gap-2 px-3 py-3",
                  isCurrent && "bg-sun/25"
                )}
              >
                <span className="inline-flex items-center gap-1 font-black text-ink">
                  {index === 0 ? <Trophy className="h-4 w-4 text-amber-500" /> : null}
                  {index > 0 && index < 3 ? <Medal className="h-4 w-4 text-pitch" /> : null}
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-black text-ink">
                    {row.name}
                    {isCurrent ? <span className="ml-2 rounded-full bg-pitch px-2 py-0.5 align-middle text-[10px] font-black text-white">Du</span> : null}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-500">
                    {row.exact_scores} exakt · {row.correct_tendencies} Tendenz · {row.open_predictions} offen
                  </p>
                </div>
                <span className="text-right text-xl font-black text-ink">{row.total_points}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="hidden overflow-hidden rounded-xl bg-white shadow-card md:block">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-pitch text-white">
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
