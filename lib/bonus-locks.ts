import type { Player } from "@/lib/types";
import { isPredictionLocked } from "@/lib/scoring";

const TODAY_BONUS_OVERRIDE_UNTIL = new Date("2026-06-13T21:59:59.999Z");
const TODAY_BONUS_OVERRIDE_PLAYERS = new Set(["henry"]);

function normalizedName(name: string) {
  return name.trim().toLowerCase();
}

export function hasTodayBonusOverride(player: Pick<Player, "name">, now: Date = new Date()) {
  return TODAY_BONUS_OVERRIDE_PLAYERS.has(normalizedName(player.name)) && now <= TODAY_BONUS_OVERRIDE_UNTIL;
}

export function isBonusLockedForPlayer(kickoffAt: string | Date, player: Pick<Player, "name">, now: Date = new Date()) {
  return isPredictionLocked(kickoffAt, now) && !hasTodayBonusOverride(player, now);
}
