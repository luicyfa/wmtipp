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
        "inline-flex rounded-full px-3 py-1 text-xs font-black",
        status === "finished" || status === "evaluated"
          ? "bg-pitch text-white"
          : status === "live"
            ? "bg-coral text-white"
            : status === "predicted"
              ? "bg-leaf text-white"
              : "bg-sun/30 text-amber-950"
      )}
    >
      {labels[status] ?? status}
    </span>
  );
}
