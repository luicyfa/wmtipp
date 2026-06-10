import Link from "next/link";
import { LogOut, Shield, Trophy } from "lucide-react";
import { logoutAction } from "@/app/actions";
import type { Player } from "@/lib/types";

export function AppHeader({ player }: { player: Pick<Player, "name" | "is_admin"> }) {
  return (
    <header className="sticky top-0 z-20 border-b border-pitch/10 bg-[#f8faf7]/[0.94] backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 pb-2 pt-3">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-ink">
          <span className="grid h-8 w-8 place-items-center rounded-2xl bg-pitch/10 text-pitch">
            <Trophy className="h-4 w-4" />
          </span>
          WM-Tipp
        </Link>
        <div className="flex items-center gap-2">
          {player.is_admin ? (
            <Link href="/admin" className="focus-ring rounded-2xl bg-pitch px-3 py-2 text-xs font-semibold text-white">
              <Shield className="mr-1 inline h-3 w-3" />
              Admin
            </Link>
          ) : null}
          <span className="hidden text-sm font-medium text-slate-600 sm:inline">{player.name}</span>
          <form action={logoutAction}>
            <button className="focus-ring rounded-2xl bg-white p-2 text-slate-600 shadow-sm" title="Abmelden">
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
      <nav className="hide-scrollbar mx-auto max-w-5xl overflow-x-auto px-4 pb-3">
        <div className="mex-nav-shell flex min-w-max gap-2 rounded-3xl p-2 shadow-sm">
          {player.is_admin ? (
            <>
              <Link className="mex-nav-link-primary" href="/admin/spiele?filter=faellig">
                Ergebnisse
              </Link>
              <Link className="mex-nav-link" href="/admin/teilnehmer">Teilnehmer</Link>
              <Link className="mex-nav-link" href="/admin">Admin</Link>
              <Link className="mex-nav-link" href="/rangliste">Rangliste</Link>
              <Link className="mex-nav-link" href="/gruppen">Gruppen</Link>
              <Link className="mex-nav-link" href="/regeln">Regeln</Link>
            </>
          ) : (
            <>
              <Link className="mex-nav-link-primary" href="/tippen">Tippen</Link>
              <Link className="mex-nav-link" href="/rangliste">Rangliste</Link>
              <Link className="mex-nav-link" href="/meine-tipps">Meine Tipps</Link>
              <Link className="mex-nav-link" href="/spiele">Spiele</Link>
              <Link className="mex-nav-link" href="/gruppen">Gruppen</Link>
              <Link className="mex-nav-link" href="/bonus">Bonus</Link>
              <Link className="mex-nav-link" href="/regeln">Regeln</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
