"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";

export function ScoreStepper({
  name,
  label,
  defaultValue,
  disabled,
  onValueChange
}: {
  name: string;
  label: string;
  defaultValue: number;
  disabled: boolean;
  onValueChange?: (value: number) => void;
}) {
  const [value, setValue] = useState(defaultValue);

  function change(delta: number) {
    setValue((current) => {
      const next = Math.max(0, Math.min(30, current + delta));
      onValueChange?.(next);
      return next;
    });
  }

  return (
    <div className="min-w-0 text-sm font-semibold">
      <span className="block min-h-10 break-words leading-tight">{label}</span>
      <div className="mt-2 grid grid-cols-[44px_1fr_44px] overflow-hidden rounded-xl border border-slate-200 bg-white">
        <button
          type="button"
          disabled={disabled || value <= 0}
          onClick={() => change(-1)}
          className="focus-ring flex min-h-14 items-center justify-center bg-slate-50 text-ink disabled:text-slate-300"
          aria-label={`${label} ein Tor weniger`}
        >
          <Minus className="h-5 w-5" />
        </button>
        <input
          name={name}
          type="number"
          min="0"
          max="30"
          value={value}
          disabled={disabled}
          onChange={(event) => {
            const next = Number(event.target.value);
            const bounded = Number.isFinite(next) ? Math.max(0, Math.min(30, next)) : 0;
            setValue(bounded);
            onValueChange?.(bounded);
          }}
          className="focus-ring w-full border-x border-slate-200 px-2 py-3 text-center text-4xl font-black disabled:bg-slate-100"
          aria-label={label}
        />
        <button
          type="button"
          disabled={disabled || value >= 30}
          onClick={() => change(1)}
          className="focus-ring flex min-h-14 items-center justify-center bg-slate-50 text-ink disabled:text-slate-300"
          aria-label={`${label} ein Tor mehr`}
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
