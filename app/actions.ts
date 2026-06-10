"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Papa from "papaparse";
import { clearSession, hashPin, requireAdmin, requirePlayer, setSession, validatePin, verifyPin } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getMatch, getMatches, getPlayerPredictions, getScoreRules } from "@/lib/data";
import { calculatePredictionPoints, isPredictionLocked } from "@/lib/scoring";

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
  const savedQuery = `saved=1&home=${homeScore}&away=${awayScore}`;

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
  if (firstKickoff && isPredictionLocked(firstKickoff)) {
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
  redirect("/bonus?saved=1");
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

  await recalculateMatch(matchId);
  revalidatePath("/admin/spiele");
  revalidatePath("/rangliste");
  revalidatePath(`/spiele/${matchId}`);
  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}result=saved`);
}

export async function recalculateMatchAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) redirect("/dashboard?error=keine-adminrechte");
  const matchId = formString(formData, "matchId");
  const returnTo = formString(formData, "returnTo") || "/admin/spiele";
  await recalculateMatch(matchId);
  revalidatePath("/admin/spiele");
  revalidatePath("/rangliste");
  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}result=recalculated`);
}

async function recalculateMatch(matchId: string) {
  const supabase = createServerSupabaseClient();
  const match = await getMatch(matchId);
  const rules = await getScoreRules();
  const { data: predictions, error } = await supabase
    .from("predictions")
    .select("*")
    .eq("match_id", matchId);
  if (error) throw error;

  for (const prediction of predictions ?? []) {
    const result = calculatePredictionPoints(prediction, match, rules);
    await supabase
      .from("predictions")
      .update({ ...result, locked_at: match.kickoff_at, updated_at: new Date().toISOString() })
      .eq("id", prediction.id);
  }
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
  revalidatePath("/admin/import");
  revalidatePath("/spiele");
}
