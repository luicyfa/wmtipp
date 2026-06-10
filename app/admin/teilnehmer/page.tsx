import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { AdminNav } from "@/components/AdminNav";
import { SubmitButton } from "@/components/SubmitButton";
import { createPlayerAction, updatePlayerAction } from "@/app/actions";
import { requireAdmin } from "@/lib/auth";
import { getPlayers } from "@/lib/data";

export default async function AdminPlayersPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/dashboard?error=keine-adminrechte");
  const players = await getPlayers(true);

  return (
    <>
      <AppHeader player={admin} />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <AdminNav />
        <h1 className="text-3xl font-black">Teilnehmer verwalten</h1>
        <form action={createPlayerAction} className="mt-5 grid gap-3 rounded-xl bg-white p-4 shadow-card sm:grid-cols-[1fr_140px_auto_auto]">
          <input name="name" placeholder="Name" className="focus-ring rounded-xl border border-slate-200 px-4 py-3" />
          <input name="pin" placeholder="PIN" inputMode="numeric" className="focus-ring rounded-xl border border-slate-200 px-4 py-3" />
          <label className="flex items-center gap-2 font-semibold"><input name="isAdmin" type="checkbox" /> Admin</label>
          <SubmitButton pendingText="Legt an..." className="focus-ring rounded-xl bg-pitch px-4 py-3 font-bold text-white">Anlegen</SubmitButton>
        </form>

        <div className="mt-5 space-y-3">
          {players.map((player) => (
            <form key={player.id} action={updatePlayerAction} className="grid gap-3 rounded-xl bg-white p-4 shadow-card md:grid-cols-[1fr_140px_auto_auto_auto]">
              <input type="hidden" name="id" value={player.id} />
              <input name="name" defaultValue={player.name} className="focus-ring rounded-xl border border-slate-200 px-4 py-3" />
              <input name="pin" placeholder="Neue PIN" inputMode="numeric" className="focus-ring rounded-xl border border-slate-200 px-4 py-3" />
              <label className="flex items-center gap-2 font-semibold"><input name="isAdmin" type="checkbox" defaultChecked={player.is_admin} /> Admin</label>
              <label className="flex items-center gap-2 font-semibold"><input name="isActive" type="checkbox" defaultChecked={player.is_active} /> Aktiv</label>
              <SubmitButton pendingText="Speichert..." className="focus-ring rounded-xl bg-ink px-4 py-3 font-bold text-white">Speichern</SubmitButton>
            </form>
          ))}
        </div>
      </main>
    </>
  );
}
