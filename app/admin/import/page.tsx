import { redirect } from "next/navigation";
import { Upload } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { AdminNav } from "@/components/AdminNav";
import { SubmitButton } from "@/components/SubmitButton";
import { importMatchesAction } from "@/app/actions";
import { requireAdmin } from "@/lib/auth";

export default async function AdminImportPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/dashboard?error=keine-adminrechte");

  return (
    <>
      <AppHeader player={admin} />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <AdminNav />
        <h1 className="text-3xl font-black">Spielplan importieren</h1>
        <form action={importMatchesAction} className="mt-5 rounded-xl bg-white p-5 shadow-card">
          <p className="mb-4 text-slate-600">CSV-Spalten: match_number, round, group_code, home_team_label, away_team_label, kickoff_at, venue.</p>
          <input name="file" type="file" accept=".csv,text/csv" className="focus-ring w-full rounded-xl border border-dashed border-slate-300 p-4" />
          <SubmitButton pendingText="Importiert..." className="focus-ring mt-4 inline-flex items-center gap-2 rounded-xl bg-pitch px-5 py-4 font-bold text-white">
            <Upload className="h-5 w-5" />
            CSV importieren
          </SubmitButton>
        </form>
      </main>
    </>
  );
}
