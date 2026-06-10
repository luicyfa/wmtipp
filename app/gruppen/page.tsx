import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { requirePlayer } from "@/lib/auth";
import { getMatches } from "@/lib/data";
import { formatDateTime } from "@/lib/dates";
import { bestThirdPlacedTeams, buildGroupTables } from "@/lib/groups";

export default async function GroupsPage() {
  const player = await requirePlayer();
  if (!player) redirect("/");

  const matches = await getMatches();
  const groups = buildGroupTables(matches);
  const thirdPlaced = bestThirdPlacedTeams(groups);
  const bestThirdNames = new Set(thirdPlaced.slice(0, 8).map((team) => `${team.groupCode}:${team.teamName}`));

  return (
    <>
      <AppHeader player={player} />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <section className="mex-hero rounded-2xl p-5 text-white shadow-card">
          <p className="text-sm font-bold uppercase text-white/65">Gruppenphase</p>
          <h1 className="mt-2 text-3xl font-black">Tabellen & Wenn-es-so-bleibt</h1>
          <p className="mt-3 text-white/75">
            Die Tabellen werden aus den eingetragenen Ergebnissen berechnet. Platz 1 und 2 wären direkt weiter, die besten acht Gruppendritten ebenfalls.
          </p>
        </section>

        <section className="mt-5 rounded-xl bg-sun/25 p-4 text-amber-950 shadow-card">
          <h2 className="font-black">Stand jetzt</h2>
          <p className="mt-2 text-sm font-semibold">
            Die Tabellen zeigen eine Live-Prognose nach den bisher eingetragenen Ergebnissen. Sortiert wird nach Punkten, direktem Duell bei Zweier-Gleichstand, Tordifferenz, erzielten Toren und Name. Extrem enge FIFA-Sonderfälle mit mehreren punktgleichen Teams sollten am Ende kurz manuell geprüft werden.
          </p>
        </section>

        <section className="mt-5 rounded-xl bg-white p-4 shadow-card">
          <h2 className="text-xl font-black">Beste Gruppendritte</h2>
          <p className="mt-1 text-sm text-slate-600">Vorläufige Übersicht nach aktuellem Tabellenstand.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {thirdPlaced.slice(0, 8).map((team, index) => (
              <div key={`${team.groupCode}-${team.teamName}`} className="rounded-lg bg-sun/25 px-3 py-2">
                <p className="text-xs font-black uppercase text-amber-900">#{index + 1} · Gruppe {team.groupCode}</p>
                <p className="font-black">{team.teamName}</p>
                <p className="text-sm text-slate-700">{team.points} Pkt · {team.goalDifference >= 0 ? "+" : ""}{team.goalDifference} TD</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          {groups.map((group) => (
            <section key={group.groupCode} className="overflow-hidden rounded-xl bg-white shadow-card">
              <div className="border-b border-slate-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold uppercase text-pitch">Gruppe {group.groupCode}</p>
                    <h2 className="text-2xl font-black">Tabelle</h2>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                    {group.finishedMatches}/{group.totalMatches} beendet
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                  <p className="rounded-lg bg-pitch/10 px-3 py-2 font-bold text-pitch">1. direkt weiter: {group.standings[0]?.teamName ?? "-"}</p>
                  <p className="rounded-lg bg-pitch/10 px-3 py-2 font-bold text-pitch">2. direkt weiter: {group.standings[1]?.teamName ?? "-"}</p>
                  <p className="rounded-lg bg-sun/25 px-3 py-2 font-bold text-amber-950">
                    3. {group.standings[2]?.teamName ?? "-"} {group.standings[2] && bestThirdNames.has(`${group.groupCode}:${group.standings[2].teamName}`) ? "wäre weiter" : "muss zittern"}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Team</th>
                      <th className="px-3 py-3">Sp</th>
                      <th className="px-3 py-3">S</th>
                      <th className="px-3 py-3">U</th>
                      <th className="px-3 py-3">N</th>
                      <th className="px-3 py-3">Tore</th>
                      <th className="px-3 py-3">TD</th>
                      <th className="px-3 py-3">Pkt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.standings.map((team, index) => (
                      <tr key={team.teamName} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-black">{index + 1}</td>
                        <td className="px-4 py-3 font-bold">{team.teamName}</td>
                        <td className="px-3 py-3">{team.played}</td>
                        <td className="px-3 py-3">{team.wins}</td>
                        <td className="px-3 py-3">{team.draws}</td>
                        <td className="px-3 py-3">{team.losses}</td>
                        <td className="px-3 py-3">{team.goalsFor}:{team.goalsAgainst}</td>
                        <td className="px-3 py-3">{team.goalDifference >= 0 ? "+" : ""}{team.goalDifference}</td>
                        <td className="px-3 py-3 text-lg font-black">{team.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-slate-100 p-4">
                <h3 className="font-black">Spiele der Gruppe</h3>
                <div className="mt-3 space-y-2">
                  {group.matches.map((match) => (
                    <div key={match.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <div>
                        <p className="font-bold">{match.home_team?.name ?? match.home_team_label} - {match.away_team?.name ?? match.away_team_label}</p>
                        <p className="text-xs text-slate-500">{formatDateTime(match.kickoff_at)}</p>
                      </div>
                      <strong>{match.home_score !== null && match.away_score !== null ? `${match.home_score}:${match.away_score}` : "Offen"}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>
      </main>
    </>
  );
}
