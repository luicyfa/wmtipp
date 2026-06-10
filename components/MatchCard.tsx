import Link from "next/link";
import { CalendarDays, ChevronRight, MapPin } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDateTime } from "@/lib/dates";
import { isPredictionLocked } from "@/lib/scoring";
import type { Match, Prediction } from "@/lib/types";

function teamName(match: Match, side: "home" | "away") {
  const team = side === "home" ? match.home_team : match.away_team;
  const label = side === "home" ? match.home_team_label : match.away_team_label;
  return team?.name ?? label ?? "Offen";
}

export function MatchCard({ match, prediction }: { match: Match; prediction?: Prediction | null }) {
  const locked = isPredictionLocked(match.kickoff_at);
  const status = match.status === "finished" ? "finished" : prediction ? "predicted" : locked ? "live" : "missing";
  const result = match.home_score !== null && match.away_score !== null ? `${match.home_score}:${match.away_score}` : null;

  return (
    <Link href={`/spiele/${match.id}`} className="block rounded-xl bg-white p-4 shadow-card transition hover:-translate-y-0.5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-pitch">
            Spiel {match.match_number ?? "-"} · {match.round}{match.group_code ? ` · Gruppe ${match.group_code}` : ""}
          </p>
          <h3 className="mt-1 text-lg font-bold text-ink">{teamName(match, "home")} vs. {teamName(match, "away")}</h3>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={status} />
          <ChevronRight className="h-4 w-4 text-slate-300" />
        </div>
      </div>
      <div className="flex flex-wrap gap-3 text-sm text-slate-600">
        <span className="inline-flex items-center gap-1"><CalendarDays className="h-4 w-4" />{formatDateTime(match.kickoff_at)}</span>
        {match.venue ? <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{match.venue}</span> : null}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <span className="block text-slate-500">Dein Tipp</span>
          <strong>{prediction ? `${prediction.home_score}:${prediction.away_score}` : "Offen"}</strong>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <span className="block text-slate-500">Ergebnis</span>
          <strong>{result ?? "Offen"}</strong>
        </div>
      </div>
    </Link>
  );
}
