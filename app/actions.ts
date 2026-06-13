"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import Papa from "papaparse";
import { clearSession, hashPin, requireAdmin, requirePlayer, setSession, validatePin, verifyPin } from "@/lib/auth";
import { isBonusLockedForPlayer } from "@/lib/bonus-locks";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getMatch, getMatches, getPlayerPredictions, getPrediction } from "@/lib/data";
import { evaluateCompletedGroupWinnerBonuses, recalculateMatch } from "@/lib/results";
import { syncResultsFromFootballData } from "@/lib/result-sync";
import { isPredictionLocked } from "@/lib/scoring";

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function formNumber(formData: FormData, key: string) {
  const value = Number(formString(formData, key));
  if (!Number.isInteger(value) || value < 0 || value > 30) {
    throw new Error("Ungueltige Eingabe.");
  }
  return value;
}

function redirectWithResult(returnTo: string, result: string, hash?: string | null) {
  const separator = returnTo.includes("?") ? "&" : "?";
  redirect(`${returnTo}${separator}result=${result}${hash ? `#${hash}` : ""}`);
}

function redirectWithParams(returnTo: string, params: Record<string, string | number | boolean | null | undefined>) {
  const urlParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined) urlParams.set(key, String(value));
  }
  const separator = returnTo.includes("?") ? "&" : "?";
  redirect(`${returnTo}${separator}${urlParams.toString()}`);
}

async function nextDueResultHash() {
  const now = new Date();
  const matches = await getMatches();
  const nextDue = matches
    .filter((match) => {
      const kickoff = new Date(match.kickoff_at);
      return kickoff <= now && (match.status !== "finished" || match.home_score === null || match.away_score === null);
    })
    .sort((a, b) => new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime())[0];

  return nextDue ? `match-${nextDue.id}` : null;
}

export async function loginAction(formData: FormData) {
  const name = formString(formData, "name");
  const pin = formString(formData, "pin");
  if (!name || !validatePin(pin)) redirect("/?error=ungueltige-eingaben");

  const supabase = createServerSupabaseClient();
  const { data: player } = await supabase
    .from("players")
    .select("*")
    .ilike("name", name)
    .maybeSingle();

  if (!player) redirect("/?error=nutzer-nicht-gefunden");
  if (!player.is_active) redirect("/?error=nutzer-deaktiviert");
  if (!(await verifyPin(pin, player.pin_hash))) redirect("/?error=falsche-pin");

  await setSession(player);
  if (player.is_admin) redirect("/admin");
  redirect("/dashboard");
}

export async function logoutAction() {
  await clearSession();
  redirect("/");
}

export async function savePredictionAction(formData: FormData) {
  const player = await requirePlayer();
  if (!player) redirect("/?error=session");
  if (player.is_admin) redirect("/admin/spiele?error=admin-tippt-nicht");

  const matchId = formString(formData, "matchId");
  const mode = formString(formData, "mode");
  const homeScore = formNumber(formData, "homeScore");
  const awayScore = formNumber(formData, "awayScore");
  const match = await getMatch(matchId);

  if (isPredictionLocked(match.kickoff_at)) {
    redirect(`/spiele/${matchId}?error=tippfrist-abgelaufen`);
  }

  const existingPrediction = await getPrediction(player.id, matchId);
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("predictions").upsert(
    {
      player_id: player.id,
      match_id: matchId,
      home_score: homeScore,
      away_score: awayScore,
      locked_at: null,
      updated_at: new Date().toISOString()
    },
    { onConflict: "player_id,match_id" }
  );
  if (error) throw error;

  revalidatePath("/spiele");
  revalidatePath(`/spiele/${matchId}`);
  revalidatePath("/meine-tipps");
  revalidatePath("/dashboard");
  revalidateTag("rankings");
  const savedQuery = `saved=1&home=${homeScore}&away=${awayScore}${existingPrediction ? "&changed=1" : ""}`;

  if (mode === "tippen") {
    const [matches, predictions] = await Promise.all([getMatches(), getPlayerPredictions(player.id)]);
    const predictionMap = new Map(predictions.map((prediction) => [prediction.match_id, prediction]));
    const nextOpen = matches.find((item) => !predictionMap.has(item.id) && !isPredictionLocked(item.kickoff_at));
    if (nextOpen) redirect(`/spiele/${nextOpen.id}?${savedQuery}&mode=tippen`);
    redirect("/tippen?done=1");
  }

  redirect(`/spiele/${matchId}?${savedQuery}`);
}

export async function saveWorldChampionPredictionAction(formData: FormData) {
  const player = await requirePlayer();
  if (!player) redirect("/?error=session");
  if (player.is_admin) redirect("/admin?error=admin-tippt-nicht");

  const teamId = formString(formData, "teamId");
  if (!teamId) redirect("/bonus?error=team-fehlt");

  const matches = await getMatches();
  const firstKickoff = matches[0]?.kickoff_at;
  if (firstKickoff && isBonusLockedForPlayer(firstKickoff, player)) {
    redirect("/bonus?error=bonus-gesperrt");
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("bonus_predictions").upsert(
    {
      player_id: player.id,
      type: "world_champion",
      team_id: teamId,
      value: null,
      points: 0,
      locked_at: null
    },
    { onConflict: "player_id,type" }
  );
  if (error) throw error;

  revalidatePath("/bonus");
  revalidatePath("/dashboard");
  revalidateTag("rankings");
  redirect("/bonus?saved=1");
}

export async function saveGroupWinnerPredictionsAction(formData: FormData) {
  const player = await requirePlayer();
  if (!player) redirect("/?error=session");
  if (player.is_admin) redirect("/admin?error=admin-tippt-nicht");

  const matches = await getMatches();
  const supabase = createServerSupabaseClient();
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id,group_code")
    .eq("placeholder", false);
  if (teamsError) throw teamsError;

  const teamGroup = new Map((teams ?? []).map((team) => [team.id as string, team.group_code as string | null]));
  const rows = [];

  for (const groupCode of "ABCDEFGHIJKL".split("")) {
    const teamId = formString(formData, `group_${groupCode}`);
    if (!teamId) continue;

    const firstGroupKickoff = matches
      .filter((match) => match.group_code === groupCode)
      .sort((a, b) => new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime())[0]?.kickoff_at;

    if (firstGroupKickoff && isBonusLockedForPlayer(firstGroupKickoff, player)) {
      redirect(`/bonus?error=gruppe-gesperrt&group=${groupCode}`);
    }

    if (teamGroup.get(teamId) !== groupCode) {
      redirect(`/bonus?error=ungueltige-gruppe&group=${groupCode}`);
    }

    rows.push({
      player_id: player.id,
      type: `group_winner_${groupCode}`,
      team_id: teamId,
      value: groupCode,
      points: 0,
      locked_at: null
    });
  }

  if (!rows.length) redirect("/bonus?error=gruppen-fehlen");

  const { error } = await supabase
    .from("bonus_predictions")
    .upsert(rows, { onConflict: "player_id,type" });
  if (error) throw error;

  revalidatePath("/bonus");
  revalidatePath("/dashboard");
  revalidateTag("rankings");
  redirect("/bonus?saved=groups");
}

export async function evaluateWorldChampionAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) redirect("/dashboard?error=keine-adminrechte");

  const teamId = formString(formData, "teamId");
  if (!teamId) redirect("/admin/bonus?error=team-fehlt");

  const supabase = createServerSupabaseClient();
  const { data: predictions, error } = await supabase
    .from("bonus_predictions")
    .select("id,team_id")
    .eq("type", "world_champion");
  if (error) throw error;

  for (const prediction of predictions ?? []) {
    await supabase
      .from("bonus_predictions")
      .update({
        points: prediction.team_id === teamId ? 10 : 0,
        locked_at: new Date().toISOString()
      })
      .eq("id", prediction.id);
  }

  revalidateTag("rankings");
  revalidatePath("/admin/bonus");
  revalidatePath("/rangliste");
  revalidatePath("/dashboard");
  redirect("/admin/bonus?result=world-champion-evaluated");
}

export async function resetWorldChampionEvaluationAction() {
  const admin = await requireAdmin();
  if (!admin) redirect("/dashboard?error=keine-adminrechte");

  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("bonus_predictions")
    .update({ points: 0, locked_at: null })
    .eq("type", "world_champion");
  if (error) throw error;

  revalidateTag("rankings");
  revalidatePath("/admin/bonus");
  revalidatePath("/rangliste");
  revalidatePath("/dashboard");
  redirect("/admin/bonus?result=world-champion-reset");
}

export async function saveResultAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) redirect("/dashboard?error=keine-adminrechte");

  const matchId = formString(formData, "matchId");
  const homeScore = formNumber(formData, "homeScore");
  const awayScore = formNumber(formData, "awayScore");
  const status = formString(formData, "status") || "finished";
  const returnTo = formString(formData, "returnTo") || "/admin/spiele";
  const supabase = createServerSupabaseClient();

  const { error } = await supabase
    .from("matches")
    .update({
      home_score: homeScore,
      away_score: awayScore,
      status,
      updated_at: new Date().toISOString()
    })
    .eq("id", matchId);
  if (error) throw error;

  revalidateTag("matches");
  await recalculateMatch(matchId);
  await evaluateCompletedGroupWinnerBonuses();
  revalidateTag("rankings");
  revalidatePath("/admin/spiele");
  revalidatePath("/rangliste");
  revalidatePath("/dashboard");
  revalidatePath(`/spiele/${matchId}`);
  const nextHash = returnTo.includes("filter=faellig") ? await nextDueResultHash() : null;
  redirectWithResult(returnTo, "saved", nextHash);
}

export async function recalculateMatchAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) redirect("/dashboard?error=keine-adminrechte");
  const matchId = formString(formData, "matchId");
  const returnTo = formString(formData, "returnTo") || "/admin/spiele";
  await recalculateMatch(matchId);
  await evaluateCompletedGroupWinnerBonuses();
  revalidateTag("matches");
  revalidateTag("rankings");
  revalidatePath("/admin/spiele");
  revalidatePath("/rangliste");
  revalidatePath("/dashboard");
  const nextHash = returnTo.includes("filter=faellig") ? await nextDueResultHash() : null;
  redirectWithResult(returnTo, "recalculated", nextHash);
}

export async function syncLiveResultsAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) redirect("/dashboard?error=keine-adminrechte");

  const returnTo = formString(formData, "returnTo") || "/admin";
  const report = await syncResultsFromFootballData();
  revalidateTag("matches");
  revalidateTag("rankings");
  revalidatePath("/admin");
  revalidatePath("/admin/spiele");
  revalidatePath("/rangliste");
  revalidatePath("/dashboard");
  revalidatePath("/gruppen");

  redirectWithParams(returnTo, {
    result: report.ok ? "live-sync" : "live-sync-error",
    checked: report.checked,
    apiFixtures: report.apiFixtures,
    linked: report.linked,
    updated: report.updated,
    recalculated: report.recalculated,
    skipped: report.skipped
  });
}

export async function createPlayerAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) redirect("/dashboard?error=keine-adminrechte");

  const name = formString(formData, "name");
  const pin = formString(formData, "pin");
  const isAdmin = formData.get("isAdmin") === "on";
  if (!name || !validatePin(pin)) redirect("/admin/teilnehmer?error=ungueltige-eingaben");

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("players").insert({
    name,
    pin_hash: await hashPin(pin),
    is_admin: isAdmin
  });
  if (error) throw error;
  revalidateTag("rankings");
  revalidatePath("/admin/teilnehmer");
}

export async function updatePlayerAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) redirect("/dashboard?error=keine-adminrechte");

  const id = formString(formData, "id");
  const pin = formString(formData, "pin");
  const patch: Record<string, unknown> = {
    name: formString(formData, "name"),
    is_admin: formData.get("isAdmin") === "on",
    is_active: formData.get("isActive") === "on",
    updated_at: new Date().toISOString()
  };
  if (pin) {
    if (!validatePin(pin)) redirect("/admin/teilnehmer?error=ungueltige-pin");
    patch.pin_hash = await hashPin(pin);
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("players").update(patch).eq("id", id);
  if (error) throw error;
  revalidateTag("rankings");
  revalidatePath("/admin/teilnehmer");
}

export async function importMatchesAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) redirect("/dashboard?error=keine-adminrechte");

  const file = formData.get("file");
  if (!(file instanceof File)) redirect("/admin/import?error=datei-fehlt");

  const csv = await file.text();
  const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });
  if (parsed.errors.length) redirect("/admin/import?error=csv-ungueltig");

  const rows = parsed.data.map((row) => ({
    match_number: Number(row.match_number),
    round: row.round,
    group_code: row.group_code || null,
    home_team_label: row.home_team_label,
    away_team_label: row.away_team_label,
    kickoff_at: row.kickoff_at,
    venue: row.venue || null,
    updated_at: new Date().toISOString()
  }));

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("matches").upsert(rows, { onConflict: "match_number" });
  if (error) throw error;
  revalidateTag("matches");
  revalidateTag("rankings");
  revalidatePath("/admin/import");
  revalidatePath("/spiele");
}
