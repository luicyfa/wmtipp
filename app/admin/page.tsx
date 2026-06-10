import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { AdminNav } from "@/components/AdminNav";
import { requireAdmin } from "@/lib/auth";
import { getMatches, getPlayers } from "@/lib/data";
import { getRankings } from "@/lib/rankings";

export default async function AdminPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/dashboard?error=keine-adminrechte");
  const [players, matches, rankings] = await Promise.all([getPlayers(true), getMatches(), getRankings()]);
  const finished = matches.filter((match) => match.status === "finished").length;

  return (
    <>
      <AppHeader player={admin} />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <AdminNav />
        <h1 className="text-3xl font-black">Admin-Dashboard</h1>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-white p-4 shadow-card"><p>Teilnehmer</p><strong className="text-3xl">{players.length}</strong></div>
          <div className="rounded-xl bg-white p-4 shadow-card"><p>Spiele</p><strong className="text-3xl">{matches.length}</strong></div>
          <div className="rounded-xl bg-white p-4 shadow-card"><p>Beendet</p><strong className="text-3xl">{finished}</strong></div>
        </div>
        <section className="mt-6 rounded-xl bg-white p-4 shadow-card">
          <h2 className="font-black">Aktueller Spitzenplatz</h2>
          <p className="mt-2 text-lg">{rankings[0] ? `${rankings[0].name} mit ${rankings[0].total_points} Punkten` : "Noch keine Punkte"}</p>
        </section>
      </main>
    </>
  );
}
