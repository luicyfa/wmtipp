import { redirect } from "next/navigation";
import { CheckCircle2, Trophy } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { FeedbackToast } from "@/components/FeedbackToast";
import { saveWorldChampionPredictionAction } from "@/app/actions";
import { requirePlayer } from "@/lib/auth";
import { getMatches, getTeams, getWorldChampionPrediction } from "@/lib/data";
import { formatDateTime } from "@/lib/dates";
import { isPredictionLocked } from "@/lib/scoring";

export default async function BonusPage({
  searchParams
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const player = await requirePlayer();
  if (!player) redirect("/");
  if (player.is_admin) redirect("/admin");

  const params = await searchParams;
  const [teams, prediction, matches] = await Promise.all([
    getTeams(),
    getWorldChampionPrediction(player.id),
    getMatches()
  ]);
  const firstKickoff = matches[0]?.kickoff_at;
  const locked = firstKickoff ? isPredictionLocked(firstKickoff) : false;
  const message =
    params.saved
      ? "Weltmeister-Tipp gespeichert. Der bleibt jetzt dein großer Bonus-Joker."
      : params.error === "bonus-gesperrt"
        ? "Der Weltmeister-Tipp ist jetzt gesperrt, weil die WM schon begonnen hat."
        : params.error === "team-fehlt"
          ? "Bitte such dir ein Team als Weltmeister aus."
          : null;

  return (
    <>
      <AppHeader player={player} />
      <FeedbackToast message={message} tone={params.error ? "error" : "success"} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <section className="rounded-2xl bg-ink p-5 text-white shadow-card">
          <p className="text-sm font-bold uppercase text-white/65">Bonus-Tipp</p>
          <h1 className="mt-2 text-3xl font-black">Wer wird Weltmeister?</h1>
          <p className="mt-3 text-white/75">
            Tipp einmal den Weltmeister. Wenn es stimmt, gibt es später Bonuspunkte. Der Tipp ist bis zum Eröffnungsspiel möglich.
          </p>
        </section>

        {prediction?.team ? (
          <section className="mt-5 rounded-xl bg-sun p-4 text-amber-950 shadow-card">
            <div className="flex items-center gap-3">
              <Trophy className="h-7 w-7" />
              <div>
                <p className="text-sm font-black uppercase">Dein aktueller Tipp</p>
                <h2 className="text-2xl font-black">{prediction.team.name}</h2>
              </div>
            </div>
          </section>
        ) : (
          <section className="mt-5 rounded-xl bg-white p-4 shadow-card">
            <p className="flex items-center gap-2 font-black text-coral">
              <CheckCircle2 className="h-5 w-5" />
              Dein Weltmeister-Tipp fehlt noch.
            </p>
          </section>
        )}

        <form action={saveWorldChampionPredictionAction} className="mt-5 rounded-xl bg-white p-4 shadow-card">
          <label className="text-sm font-bold">
            Weltmeister auswählen
            <select
              name="teamId"
              defaultValue={prediction?.team_id ?? ""}
              disabled={locked}
              className="focus-ring mt-2 w-full rounded-xl border border-slate-200 px-4 py-4 font-semibold disabled:bg-slate-100"
            >
              <option value="">Team auswählen</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <button
            disabled={locked}
            className="focus-ring mt-4 w-full rounded-xl bg-pitch px-5 py-4 font-black text-white disabled:bg-slate-300"
          >
            Weltmeister-Tipp speichern
          </button>
          <p className="mt-3 text-sm text-slate-600">
            {locked
              ? "Die WM hat begonnen, der Bonus-Tipp ist gesperrt."
              : firstKickoff
                ? `Tipp möglich bis: ${formatDateTime(firstKickoff)}`
                : "Tipp möglich bis zum ersten Spiel."}
          </p>
        </form>
      </main>
    </>
  );
}
