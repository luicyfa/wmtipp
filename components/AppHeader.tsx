import Link from "next/link";
import { LogOut, Shield, Trophy } from "lucide-react";
import { logoutAction } from "@/app/actions";
import type { Player } from "@/lib/types";

export function AppHeader({ player }: { player: Pick<Player, "name" | "is_admin"> }) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/70 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-ink">
          <Trophy className="h-5 w-5 text-pitch" />
          WM-Tipp
        </Link>
        <div className="flex items-center gap-2">
          {player.is_admin ? (
            <Link href="/admin" className="focus-ring rounded-full bg-ink px-3 py-2 text-xs font-semibold text-white">
              <Shield className="mr-1 inline h-3 w-3" />
              Admin
            </Link>
          ) : null}
          <span className="hidden text-sm font-medium text-slate-600 sm:inline">{player.name}</span>
          <form action={logoutAction}>
            <button className="focus-ring rounded-full bg-white p-2 text-slate-600 shadow-sm" title="Abmelden">
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
      <nav className="mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 pb-3 text-sm font-semibold">
        {player.is_admin ? (
          <>
            <Link className="rounded-full bg-sun px-5 py-2 font-black text-amber-950 shadow-sm" href="/admin/spiele?filter=faellig">
              Ergebnisse
            </Link>
            <Link className="rounded-full bg-slate-100 px-3 py-2" href="/admin/teilnehmer">Teilnehmer</Link>
            <Link className="rounded-full bg-slate-100 px-3 py-2" href="/admin">Admin</Link>
            <Link className="rounded-full bg-slate-100 px-3 py-2" href="/rangliste">Rangliste</Link>
            <Link className="rounded-full bg-slate-100 px-3 py-2" href="/gruppen">Gruppen</Link>
          </>
        ) : (
          <>
            <Link className="rounded-full bg-sun px-5 py-2 font-black text-amber-950 shadow-sm" href="/tippen">Tippen</Link>
            <Link className="rounded-full bg-slate-100 px-3 py-2" href="/rangliste">Rangliste</Link>
            <Link className="rounded-full bg-slate-100 px-3 py-2" href="/meine-tipps">Meine Tipps</Link>
            <Link className="rounded-full bg-slate-100 px-3 py-2" href="/spiele">Spiele</Link>
            <Link className="rounded-full bg-slate-100 px-3 py-2" href="/gruppen">Gruppen</Link>
            <Link className="rounded-full bg-slate-100 px-3 py-2" href="/bonus">Bonus</Link>
          </>
        )}
      </nav>
    </header>
  );
}
