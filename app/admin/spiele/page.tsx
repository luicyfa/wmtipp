import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { AdminNav } from "@/components/AdminNav";
import { FeedbackToast } from "@/components/FeedbackToast";
import { saveResultAction, recalculateMatchAction } from "@/app/actions";
import { requireAdmin } from "@/lib/auth";
import { getMatches } from "@/lib/data";
import { addDays, formatDateTime, startOfLocalDay } from "@/lib/dates";

const statusLabels = {
  scheduled: "Offen",
  live: "Gesperrt",
  finished: "Beendet"
} as const;

function getStatusLabel(status: string) {
  return status in statusLabels ? statusLabels[status as keyof typeof statusLabels] : status;
}

const filters = [
  ["alle", "Alle"],
  ["offen", "Offen"],
  ["faellig", "Auszuwerten"],
  ["heute", "Heute"],
  ["morgen", "Morgen"],
  ["live", "Live"],
  ["beendet", "Beendet"]
];

function includesQuery(value: string | null | undefined, query: string) {
  return value?.toLowerCase().includes(query) ?? false;
}

export default async function AdminMatchesPage({
  searchParams
}: {
  searchParams: Promise<{ filter?: string; q?: string; result?: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect("/dashboard?error=keine-adminrechte");
  const params = await searchParams;
  const activeFilter = params.filter ?? "alle";
  const query = (params.q ?? "").trim().toLowerCase();
  const matches = await getMatches();
  const unfinished = matches.filter((match) => match.status !== "finished").length;
  const finished = matches.length - unfinished;
  const today = startOfLocalDay();
  const tomorrow = addDays(today, 1);
  const afterTomorrow = addDays(today, 2);
  const now = new Date();
  const missingResults = matches.filter((match) => {
    const kickoff = new Date(match.kickoff_at);
    return kickoff <= now && (match.status !== "finished" || match.home_score === null || match.away_score === null);
  }).sort((a, b) => new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime());
  const nextMissingResult = missingResults[0] ?? null;
  const filteredMatches = matches.filter((match) => {
    const kickoff = new Date(match.kickoff_at);
    if (activeFilter === "offen" && match.status === "finished") return false;
    if (activeFilter === "faellig" && !missingResults.some((item) => item.id === match.id)) return false;
    if (activeFilter === "heute" && (kickoff < today || kickoff >= tomorrow)) return false;
    if (activeFilter === "morgen" && (kickoff < tomorrow || kickoff >= afterTomorrow)) return false;
    if (activeFilter === "live" && match.status !== "live") return false;
    if (activeFilter === "beendet" && match.status !== "finished") return false;
    if (!query) return true;

    return (
      String(match.match_number ?? "").includes(query) ||
      includesQuery(match.round, query) ||
      includesQuery(match.group_code, query) ||
      includesQuery(match.venue, query) ||
      includesQuery(match.home_team?.name, query) ||
      includesQuery(match.away_team?.name, query) ||
      includesQuery(match.home_team_label, query) ||
      includesQuery(match.away_team_label, query)
    );
  });
  const nextMatches = [...filteredMatches].sort((a, b) => {
    if (a.status === "finished" && b.status !== "finished") return 1;
    if (a.status !== "finished" && b.status === "finished") return -1;
    return new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime();
  });
  const querySuffix = query ? `&q=${encodeURIComponent(query)}` : "";
  const returnTo = `/admin/spiele?filter=${activeFilter}${querySuffix}`;
  const feedback =
    params.result === "saved"
      ? "Alles klar, Ergebnis gespeichert und Punkte neu berechnet."
      : params.result === "recalculated"
        ? "Fertig, die Punkte für dieses Spiel sind frisch berechnet."
        : null;

  return (
    <>
      <AppHeader player={admin} />
      <FeedbackToast message={feedback} />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <AdminNav />
        <h1 className="text-3xl font-black">Ergebnisse eintragen</h1>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-white p-4 shadow-card">
            <p className="text-sm text-slate-600">Spiele gesamt</p>
            <strong className="text-3xl">{matches.length}</strong>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-card">
            <p className="text-sm text-slate-600">Noch offen</p>
            <strong className="text-3xl">{unfinished}</strong>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-card">
            <p className="text-sm text-slate-600">Beendet</p>
            <strong className="text-3xl">{finished}</strong>
          </div>
        </div>
        <section className="mt-5 rounded-xl bg-sun/30 p-4 text-amber-950 shadow-sm">
          <p className="text-sm font-black uppercase tracking-wide">Ergebnisassistent</p>
          <h2 className="mt-1 text-2xl font-black">
            {missingResults.length ? `${missingResults.length} Spiele warten aufs Ergebnis` : "Alles erledigt"}
          </h2>
          <p className="mt-2 text-sm font-semibold">
            Hier landen Spiele, die schon begonnen haben und noch nicht als Beendet ausgewertet sind.
          </p>
          {nextMissingResult ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Link href={`/admin/spiele?filter=faellig#match-${nextMissingResult.id}`} className="focus-ring rounded-xl bg-amber-950 px-4 py-3 text-center font-black text-white">
                Nächstes fälliges Ergebnis eintragen
              </Link>
              <Link href="/admin/spiele?filter=faellig" className="focus-ring rounded-xl bg-white/70 px-4 py-3 text-center font-black text-amber-950">
                Alle anzeigen
              </Link>
            </div>
          ) : (
            <Link href="/admin/spiele?filter=beendet" className="focus-ring mt-4 inline-flex rounded-xl bg-white/70 px-4 py-3 font-black text-amber-950">
              Beendete Spiele ansehen
            </Link>
          )}
        </section>
        <section className="mt-5 rounded-xl bg-white p-4 shadow-card">
          <form className="grid gap-3 sm:grid-cols-[1fr_auto]" action="/admin/spiele">
            <input type="hidden" name="filter" value={activeFilter} />
            <label className="text-sm font-bold">
              Spiel suchen
              <input
                name="q"
                type="search"
                defaultValue={params.q ?? ""}
                placeholder="Team, Spielnummer, Ort"
                className="focus-ring mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-semibold"
              />
            </label>
            <button className="focus-ring rounded-xl bg-ink px-5 py-3 font-bold text-white sm:self-end">
              Suchen
            </button>
          </form>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {filters.map(([key, label]) => (
              <Link
                key={key}
                href={`/admin/spiele?filter=${key}${querySuffix}`}
                className={`rounded-full px-4 py-2 text-sm font-bold ${activeFilter === key ? "bg-pitch text-white" : "bg-slate-100 text-slate-700"}`}
              >
                {label}
              </Link>
            ))}
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-600">
            {nextMatches.length} von {matches.length} Spielen angezeigt
          </p>
        </section>
        <div className="mt-5 space-y-3">
          {nextMatches.length ? nextMatches.map((match) => (
            <div key={match.id} id={`match-${match.id}`} className="scroll-mt-36 rounded-xl bg-white p-4 shadow-card">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase text-pitch">Spiel {match.match_number ?? "-"} · {formatDateTime(match.kickoff_at)}</p>
                  <h2 className="text-lg font-black">{match.home_team?.name ?? match.home_team_label} gegen {match.away_team?.name ?? match.away_team_label}</h2>
                  <p className="mt-1 text-sm text-slate-600">{match.venue}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                  {getStatusLabel(match.status)}
                </span>
              </div>
              <form action={saveResultAction} className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_170px_auto] sm:items-end">
                <input type="hidden" name="matchId" value={match.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <label className="text-sm font-bold">
                  Heimtore
                  <input name="homeScore" type="number" min="0" defaultValue={match.home_score ?? 0} className="focus-ring mt-2 w-full rounded-xl border border-slate-200 px-4 py-4 text-center text-2xl font-black" />
                </label>
                <span className="hidden pb-4 text-2xl font-black text-slate-300 sm:block">:</span>
                <label className="text-sm font-bold">
                  Auswärtstore
                  <input name="awayScore" type="number" min="0" defaultValue={match.away_score ?? 0} className="focus-ring mt-2 w-full rounded-xl border border-slate-200 px-4 py-4 text-center text-2xl font-black" />
                </label>
                <select name="status" defaultValue={match.status} className="focus-ring rounded-xl border border-slate-200 px-4 py-4 font-semibold">
                  <option value="scheduled">Offen</option>
                  <option value="live">Gesperrt</option>
                  <option value="finished">Beendet</option>
                </select>
                <button className="focus-ring rounded-xl bg-pitch px-4 py-4 font-bold text-white">Ergebnis speichern</button>
              </form>
              <form action={recalculateMatchAction} className="mt-2">
                <input type="hidden" name="matchId" value={match.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <button className="text-sm font-bold text-pitch">Punkte für dieses Spiel neu berechnen</button>
              </form>
            </div>
          )) : (
            <div className="rounded-xl bg-white p-6 text-center shadow-card">
              <h2 className="text-xl font-black">Keine Spiele gefunden</h2>
              <p className="mt-2 text-slate-600">Passe Suche oder Filter an, dann tauchen die passenden Spiele hier auf.</p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
