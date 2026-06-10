"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import { clsx } from "clsx";

export function SubmitButton({
  children,
  pendingText = "Bitte warten...",
  className,
  disabled = false
}: {
  children: ReactNode;
  pendingText?: string;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      disabled={disabled || pending}
      className={clsx(
        className,
        "transition active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-300"
      )}
      aria-busy={pending}
    >
      {pending ? pendingText : children}
    </button>
  );
}
