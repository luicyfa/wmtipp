import { redirect } from "next/navigation";
import { RotateCcw, Trophy } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { AdminNav } from "@/components/AdminNav";
import { FeedbackToast } from "@/components/FeedbackToast";
import { SubmitButton } from "@/components/SubmitButton";
import { evaluateWorldChampionAction, resetWorldChampionEvaluationAction } from "@/app/actions";
import { requireAdmin } from "@/lib/auth";
import { getTeams } from "@/lib/data";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { BonusPrediction } from "@/lib/types";

export default async function AdminBonusPage({
  searchParams
}: {
  searchParams: Promise<{ result?: string; error?: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect("/dashboard?error=keine-adminrechte");

  const params = await searchParams;
  const supabase = createServerSupabaseClient();
  const [teams, predictionsResult] = await Promise.all([
    getTeams(),
    supabase
      .from("bonus_predictions")
      .select("*,player:players(id,name),team:teams(id,name,short_name)")
      .eq("type", "world_champion")
      .order("created_at", { ascending: true })
  ]);
  if (predictionsResult.error) throw predictionsResult.error;

  const predictions = (predictionsResult.data ?? []) as (BonusPrediction & {
    player?: { id: string; name: string } | null;
  })[];
  const evaluated = predictions.some((prediction) => prediction.locked_at !== null);
  const correctPredictions = predictions.filter((prediction) => prediction.points > 0);
  const message =
    params.result === "world-champion-evaluated"
      ? "Weltmeister ausgewertet. Die Bonuspunkte sind jetzt in der Rangliste."
      : params.result === "world-champion-reset"
        ? "Weltmeister-Auswertung zurückgesetzt."
        : params.error === "team-fehlt"
          ? "Bitte wähle den Weltmeister aus."
          : null;

  return (
    <>
      <AppHeader player={admin} />
      <FeedbackToast message={message} tone={params.error ? "error" : "success"} />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <AdminNav />
        <h1 className="text-3xl font-black">Bonus auswerten</h1>

        <section className="mex-hero mt-5 rounded-2xl p-5 text-white shadow-card">
          <p className="text-sm font-black uppercase text-white/65">Weltmeister</p>
          <h2 className="mt-2 text-3xl font-black">
            {evaluated ? "Weltmeister ist ausgewertet" : "Weltmeister später setzen"}
          </h2>
          <p className="mt-3 text-white/75">
            Wähle am Turnierende den echten Weltmeister aus. Richtige Tipps bekommen 10 Bonuspunkte.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-white/10 p-4">
              <p className="text-sm text-white/70">Tipps</p>
              <strong className="text-3xl">{predictions.length}</strong>
            </div>
            <div className="rounded-xl bg-white/10 p-4">
              <p className="text-sm text-white/70">Richtig</p>
              <strong className="text-3xl">{correctPredictions.length}</strong>
            </div>
            <div className="rounded-xl bg-white/10 p-4">
              <p className="text-sm text-white/70">Punkte</p>
              <strong className="text-3xl">10</strong>
            </div>
          </div>
        </section>

        <form action={evaluateWorldChampionAction} className="mt-5 rounded-xl bg-white p-4 shadow-card">
          <label className="text-sm font-bold">
            Echter Weltmeister
            <select name="teamId" className="focus-ring mt-2 w-full rounded-xl border border-slate-200 px-4 py-4 font-semibold">
              <option value="">Team auswählen</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <SubmitButton pendingText="Wertet aus..." className="focus-ring mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-pitch px-5 py-4 font-black text-white">
            <Trophy className="h-5 w-5" />
            Weltmeister auswerten
          </SubmitButton>
        </form>

        <section className="mt-5 rounded-xl bg-white p-4 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black">Abgegebene Weltmeister-Tipps</h2>
            <form action={resetWorldChampionEvaluationAction}>
              <SubmitButton pendingText="Setzt zurück..." className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-700">
                <RotateCcw className="h-4 w-4" />
                Zurücksetzen
              </SubmitButton>
            </form>
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {predictions.length ? predictions.map((prediction) => (
              <div key={prediction.id} className="grid grid-cols-[1fr_auto] gap-3 py-3">
                <div>
                  <p className="font-black">{prediction.player?.name ?? "Unbekannt"}</p>
                  <p className="text-sm text-slate-600">{prediction.team?.name ?? "Kein Team"}</p>
                </div>
                <span className={`self-center rounded-full px-3 py-1 text-sm font-black ${prediction.points > 0 ? "bg-sun text-amber-950" : "bg-slate-100 text-slate-600"}`}>
                  {prediction.points} Punkte
                </span>
              </div>
            )) : (
              <p className="py-4 text-slate-600">Noch keine Weltmeister-Tipps abgegeben.</p>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
