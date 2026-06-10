import "server-only";
import { cookies } from "next/headers";
import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Player } from "@/lib/types";

const scrypt = promisify(scryptCallback);
const SESSION_COOKIE = "wm_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

type SessionPayload = {
  playerId: string;
  name: string;
  isAdmin: boolean;
  exp: number;
};

function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 24) {
    throw new Error("SESSION_SECRET muss gesetzt sein und mindestens 24 Zeichen haben.");
  }
  return secret;
}

function base64Url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function sign(value: string) {
  return createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

export async function hashPin(pin: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(pin, salt, 64)) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

export async function verifyPin(pin: string, storedHash: string) {
  const [algorithm, salt, hash] = storedHash.split(":");
  if (algorithm !== "scrypt" || !salt || !hash) return false;
  const derived = (await scrypt(pin, salt, 64)) as Buffer;
  const expected = Buffer.from(hash, "hex");
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

export function validatePin(pin: string) {
  return /^\d{4,6}$/.test(pin);
}

export async function setSession(player: Pick<Player, "id" | "name" | "is_admin">) {
  const payload: SessionPayload = {
    playerId: player.id,
    name: player.name,
    isAdmin: player.is_admin,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS
  };
  const body = base64Url(JSON.stringify(payload));
  const value = `${body}.${sign(body)}`;
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  const [body, signature] = raw.split(".");
  if (!body || !signature || sign(body) !== signature) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function requirePlayer(): Promise<Player | null> {
  const session = await getSession();
  if (!session) return null;

  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("players")
    .select("id,name,is_admin,is_active,created_at,updated_at,pin_hash")
    .eq("id", session.playerId)
    .single();

  const player = data as Player | null;
  if (!player || !player.is_active) return null;
  return player;
}

export async function requireAdmin(): Promise<Player | null> {
  const player = await requirePlayer();
  if (!player?.is_admin) return null;
  return player;
}
