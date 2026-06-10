import { clsx } from "clsx";

const labels: Record<string, string> = {
  scheduled: "Offen",
  live: "Gesperrt",
  finished: "Beendet",
  predicted: "Getippt",
  missing: "Offen",
  evaluated: "Ausgewertet"
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={clsx(
        "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
        status === "finished" || status === "evaluated"
          ? "bg-ink text-white"
          : status === "live"
            ? "bg-coral text-white"
            : status === "predicted"
              ? "bg-pitch text-white"
              : "bg-sun/25 text-amber-900"
      )}
    >
      {labels[status] ?? status}
    </span>
  );
}
