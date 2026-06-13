import { redirect } from "next/navigation";
import { CheckCircle2, ListChecks, Trophy } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { FeedbackToast } from "@/components/FeedbackToast";
import { SubmitButton } from "@/components/SubmitButton";
import { saveGroupWinnerPredictionsAction, saveWorldChampionPredictionAction } from "@/app/actions";
import { requirePlayer } from "@/lib/auth";
import { hasTodayBonusOverride, isBonusLockedForPlayer } from "@/lib/bonus-locks";
import { getBonusPredictions, getMatches, getTeams } from "@/lib/data";
import { formatDateTime } from "@/lib/dates";

const groupCodes = "ABCDEFGHIJKL".split("");

export default async function BonusPage({
  searchParams
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const player = await requirePlayer();
  if (!player) redirect("/");
  if (player.is_admin) redirect("/admin");

  const params = await searchParams;
  const [teams, bonusPredictions, matches] = await Promise.all([
    getTeams(),
    getBonusPredictions(player.id),
    getMatches()
  ]);
  const prediction = bonusPredictions.find((item) => item.type === "world_champion") ?? null;
  const groupWinnerPredictions = bonusPredictions.filter((item) => item.type.startsWith("group_winner_"));
  const firstKickoff = matches[0]?.kickoff_at;
  const bonusOverrideOpen = hasTodayBonusOverride(player);
  const locked = firstKickoff ? isBonusLockedForPlayer(firstKickoff, player) : false;
  const groupPredictionMap = new Map(
    groupWinnerPredictions.map((item) => [item.type.replace("group_winner_", ""), item])
  );
  const groupTeams = new Map(groupCodes.map((groupCode) => [
    groupCode,
    teams.filter((team) => team.group_code === groupCode)
  ]));
  const missingGroupTips = groupCodes.filter((groupCode) => !groupPredictionMap.has(groupCode)).length;
  const message =
    params.saved === "groups"
      ? "Gruppensieger gespeichert. Das macht die Vorrunde gleich spannender."
      : params.saved
      ? "Weltmeister-Tipp gespeichert. Der bleibt jetzt dein großer Bonus-Joker."
      : params.error === "bonus-gesperrt"
        ? "Der Weltmeister-Tipp ist jetzt gesperrt, weil die WM schon begonnen hat."
        : params.error === "gruppe-gesperrt"
          ? "Diese Gruppe hat schon begonnen. Der Gruppensieger-Tipp ist gesperrt."
          : params.error === "gruppen-fehlen"
            ? "Such dir mindestens einen Gruppensieger aus."
            : params.error === "ungueltige-gruppe"
              ? "Dieser Tipp passt nicht zur ausgewählten Gruppe."
        : params.error === "team-fehlt"
          ? "Bitte such dir ein Team als Weltmeister aus."
          : null;

  return (
    <>
      <AppHeader player={player} />
      <FeedbackToast message={message} tone={params.error ? "error" : "success"} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <section className="mex-hero rounded-2xl p-5 text-white shadow-card">
          <p className="text-sm font-bold uppercase text-white/65">Bonus-Tipp</p>
          <h1 className="mt-2 text-3xl font-black">Bonus-Tipps</h1>
          <p className="mt-3 text-white/75">
            Tipp den Weltmeister und die Gruppensieger. Das sind Extra-Punkte, aber die normalen Spieltipps bleiben der Hauptteil.
          </p>
          {bonusOverrideOpen ? (
            <p className="mt-4 rounded-xl bg-white/15 px-4 py-3 text-sm font-bold text-white">
              Bonus heute nochmal offen: Bitte bis 23:59 Uhr speichern.
            </p>
          ) : null}
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
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">Weltmeister</h2>
              <p className="mt-1 text-sm text-slate-600">Richtig getippt: 10 Bonuspunkte.</p>
            </div>
            <span className="rounded-full bg-sun px-3 py-1 text-sm font-black text-amber-950">10 Punkte</span>
          </div>
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
          <SubmitButton
            disabled={locked}
            pendingText="Speichert..."
            className="focus-ring mt-4 w-full rounded-xl bg-pitch px-5 py-4 font-black text-white disabled:bg-slate-300"
          >
            Weltmeister-Tipp speichern
          </SubmitButton>
          <p className="mt-3 text-sm text-slate-600">
            {locked
              ? "Die WM hat begonnen, der Bonus-Tipp ist gesperrt."
              : firstKickoff
                ? `Tipp möglich bis: ${formatDateTime(firstKickoff)}`
                : "Tipp möglich bis zum ersten Spiel."}
          </p>
        </form>

        <section className="mt-6 rounded-2xl bg-white p-4 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-black">
                <ListChecks className="h-5 w-5 text-pitch" />
                Gruppensieger
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Pro richtigem Gruppensieger gibt es 2 Punkte. Jeder Tipp ist bis zum ersten Spiel der jeweiligen Gruppe möglich.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-pitch px-3 py-1 text-sm font-black text-white">{12 - missingGroupTips}/12</span>
          </div>

          <div className={`mt-4 rounded-xl p-3 text-sm font-bold ${missingGroupTips ? "bg-sun/30 text-amber-950" : "bg-pitch/10 text-pitch"}`}>
            {missingGroupTips ? `Dir fehlen noch ${missingGroupTips} Gruppensieger-Tipps.` : "Alle Gruppensieger sind getippt."}
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/70">
              <div className="h-full rounded-full bg-pitch" style={{ width: `${Math.round(((12 - missingGroupTips) / 12) * 100)}%` }} />
            </div>
          </div>

          <form action={saveGroupWinnerPredictionsAction} className="mt-4">
            <div className="grid gap-2 sm:grid-cols-2">
            {groupCodes.map((groupCode) => {
              const teamsForGroup = groupTeams.get(groupCode) ?? [];
              const currentPrediction = groupPredictionMap.get(groupCode);
              const firstGroupKickoff = matches
                .filter((match) => match.group_code === groupCode)
                .sort((a, b) => new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime())[0]?.kickoff_at;
              const groupLocked = firstGroupKickoff ? isBonusLockedForPlayer(firstGroupKickoff, player) : false;

              return (
                <article key={groupCode} className={`rounded-xl border p-3 ${currentPrediction ? "border-pitch/20 bg-pitch/5" : "border-slate-100 bg-slate-50"}`}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-black">Gruppe {groupCode}</h3>
                      <p className="text-xs font-semibold text-slate-500">
                        {groupLocked
                          ? "Gesperrt"
                          : firstGroupKickoff
                            ? `Bis ${formatDateTime(firstGroupKickoff)}`
                            : "Bis zum ersten Gruppenspiel"}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${currentPrediction ? "bg-pitch text-white" : "bg-white text-slate-600"}`}>
                      {currentPrediction ? "Gespeichert" : "Offen"}
                    </span>
                  </div>
                  <select
                    name={`group_${groupCode}`}
                    defaultValue={currentPrediction?.team_id ?? ""}
                    disabled={groupLocked}
                    className="focus-ring w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-semibold disabled:bg-slate-100"
                  >
                    <option value="">Gruppensieger auswählen</option>
                    {teamsForGroup.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </article>
              );
            })}
            </div>
            <SubmitButton pendingText="Speichert..." className="focus-ring mt-4 w-full rounded-xl bg-pitch px-5 py-4 font-black text-white">
              Gruppensieger speichern
            </SubmitButton>
          </form>
        </section>
      </main>
    </>
  );
}
