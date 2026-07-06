"use client";

import { useState } from "react";
import { ScoreStepper } from "@/components/ScoreStepper";

export function PredictionScoreControls({
  homeLabel,
  awayLabel,
  homeTeamId,
  awayTeamId,
  defaultHomeScore,
  defaultAwayScore,
  defaultAdvancingTeamId,
  disabled,
  knockout
}: {
  homeLabel: string;
  awayLabel: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  defaultHomeScore: number;
  defaultAwayScore: number;
  defaultAdvancingTeamId: string | null;
  disabled: boolean;
  knockout: boolean;
}) {
  const [homeScore, setHomeScore] = useState(defaultHomeScore);
  const [awayScore, setAwayScore] = useState(defaultAwayScore);
  const needsAdvancingPick = knockout && homeScore === awayScore;

  return (
    <>
      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-end gap-3">
        <ScoreStepper
          name="homeScore"
          label={homeLabel}
          defaultValue={defaultHomeScore}
          disabled={disabled}
          onValueChange={setHomeScore}
        />
        <span className="pb-4 text-2xl font-black text-slate-400">:</span>
        <ScoreStepper
          name="awayScore"
          label={awayLabel}
          defaultValue={defaultAwayScore}
          disabled={disabled}
          onValueChange={setAwayScore}
        />
      </div>

      {needsAdvancingPick ? (
        <fieldset className="mt-4 rounded-xl border-2 border-sun bg-sun/20 p-3" disabled={disabled}>
          <legend className="px-1 text-sm font-black text-amber-950">Pflicht bei Unentschieden · Wer kommt weiter?</legend>
          <p className="mt-1 text-sm font-black text-amber-950">
            Bitte eine Mannschaft auswählen. Sonst kann der Tipp nicht gespeichert werden.
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[
              [homeTeamId, homeLabel],
              [awayTeamId, awayLabel]
            ].map(([teamId, label]) => (
              <label
                key={teamId ?? label}
                className="flex min-h-14 items-center gap-2 rounded-xl border border-amber-200 bg-white px-3 py-3 font-bold text-ink"
              >
                <input
                  type="radio"
                  name="advancingTeamId"
                  value={teamId ?? ""}
                  defaultChecked={defaultAdvancingTeamId === teamId}
                  required
                  className="h-5 w-5 accent-pitch"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
    </>
  );
}
