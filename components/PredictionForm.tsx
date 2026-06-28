import { Save } from "lucide-react";
import { savePredictionAction } from "@/app/actions";
import { PredictionScoreControls } from "@/components/PredictionScoreControls";
import { SubmitButton } from "@/components/SubmitButton";
import { formatDateTime } from "@/lib/dates";
import { isKnockoutMatch, isMatchPredictionOpen } from "@/lib/knockout";
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
  const released = isMatchPredictionOpen(match);
  const disabled = locked || !released;
  const knockout = isKnockoutMatch(match);
  const homeLabel = teamLabel(match, "home");
  const awayLabel = teamLabel(match, "away");
  const hasPrediction = prediction !== null;

  return (
    <form action={savePredictionAction} className="rounded-xl bg-white p-4 shadow-card">
      <input type="hidden" name="matchId" value={match.id} />
      {mode ? <input type="hidden" name="mode" value={mode} /> : null}
      <h2 className="text-lg font-bold">{hasPrediction && !locked ? "Deinen Tipp ändern" : "Dein Tipp"}</h2>
      <p className="mt-1 text-sm text-slate-600">
        {!released
          ? "Diese Finalrunden-Begegnung wird tippbar, sobald beide Mannschaften feststehen."
          : locked
          ? "Spiel hat begonnen - Tipp ist gesperrt."
          : hasPrediction
            ? `Du kannst deinen Tipp noch bis ${formatDateTime(match.kickoff_at)} ändern.`
            : `Tipp möglich bis: ${formatDateTime(match.kickoff_at)}`}
      </p>
      <PredictionScoreControls
        key={match.id}
        homeLabel={homeLabel}
        awayLabel={awayLabel}
        homeTeamId={match.home_team_id}
        awayTeamId={match.away_team_id}
        defaultHomeScore={prediction?.home_score ?? 0}
        defaultAwayScore={prediction?.away_score ?? 0}
        defaultAdvancingTeamId={prediction?.advancing_team_id ?? null}
        disabled={disabled}
        knockout={knockout && released}
      />
      <SubmitButton
        disabled={disabled}
        pendingText={mode ? "Speichert & weiter..." : "Speichert..."}
        className="focus-ring mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-pitch px-5 py-4 font-bold text-white disabled:bg-slate-300"
      >
        <Save className="h-5 w-5" />
        {hasPrediction && !locked ? "Änderung speichern" : "Tipp speichern"}
      </SubmitButton>
    </form>
  );
}
