"use client";

import { CheckCircle2, X } from "lucide-react";
import { useEffect, useState } from "react";

export function FeedbackToast({
  message,
  tone = "success"
}: {
  message?: string | null;
  tone?: "success" | "error";
}) {
  const [visible, setVisible] = useState(Boolean(message));

  useEffect(() => {
    setVisible(Boolean(message));
    if (!message) return;
    const timer = window.setTimeout(() => setVisible(false), 4200);
    return () => window.clearTimeout(timer);
  }, [message]);

  if (!message || !visible) return null;

  return (
    <div className="fixed inset-x-4 top-4 z-50 mx-auto max-w-md">
      <div className={`flex items-start gap-3 rounded-xl px-4 py-3 font-bold shadow-card ${tone === "success" ? "bg-pitch text-white" : "bg-coral text-white"}`}>
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
        <p className="min-w-0 flex-1">{message}</p>
        <button type="button" onClick={() => setVisible(false)} className="focus-ring rounded-full p-1 text-white/80 hover:text-white" aria-label="Hinweis schließen">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
