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
        <fieldset className="mt-4" disabled={disabled}>
          <legend className="text-sm font-black">Wer kommt weiter? · 1 Zusatzpunkt</legend>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            Nur nötig, wenn du nach 90 Minuten ein Unentschieden tippst.
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[
              [homeTeamId, homeLabel],
              [awayTeamId, awayLabel]
            ].map(([teamId, label]) => (
              <label
                key={teamId ?? label}
                className="flex min-h-14 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 font-bold"
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
