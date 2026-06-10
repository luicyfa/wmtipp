import { Save } from "lucide-react";
import { savePredictionAction } from "@/app/actions";
import { ScoreStepper } from "@/components/ScoreStepper";
import { SubmitButton } from "@/components/SubmitButton";
import { formatDateTime } from "@/lib/dates";
import { isPredictionLocked } from "@/lib/scoring";
import type { Match, Prediction } from "@/lib/types";

function teamLabel(match: Match, side: "home" | "away") {
  if (side === "home") return match.home_team?.name ?? match.home_team_label ?? "Heimteam";
  return match.away_team?.name ?? match.away_team_label ?? "Auswärtsteam";
}

export function PredictionForm({
  match,
  prediction,
  mode
}: {
  match: Match;
  prediction: Prediction | null;
  mode?: "tippen";
}) {
  const locked = isPredictionLocked(match.kickoff_at);
  const homeLabel = teamLabel(match, "home");
  const awayLabel = teamLabel(match, "away");

  return (
    <form action={savePredictionAction} className="rounded-xl bg-white p-4 shadow-card">
      <input type="hidden" name="matchId" value={match.id} />
      {mode ? <input type="hidden" name="mode" value={mode} /> : null}
      <h2 className="text-lg font-bold">Dein Tipp</h2>
      <p className="mt-1 text-sm text-slate-600">
        {locked ? "Spiel hat begonnen - Tipp ist gesperrt." : `Tipp möglich bis: ${formatDateTime(match.kickoff_at)}`}
      </p>
      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-end gap-3">
        <ScoreStepper name="homeScore" label={homeLabel} defaultValue={prediction?.home_score ?? 0} disabled={locked} />
        <span className="pb-4 text-2xl font-black text-slate-400">:</span>
        <ScoreStepper name="awayScore" label={awayLabel} defaultValue={prediction?.away_score ?? 0} disabled={locked} />
      </div>
      <SubmitButton
        disabled={locked}
        pendingText={mode ? "Speichert & weiter..." : "Speichert..."}
        className="focus-ring mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-pitch px-5 py-4 font-bold text-white disabled:bg-slate-300"
      >
        <Save className="h-5 w-5" />
        Tipp speichern
      </SubmitButton>
    </form>
  );
}
