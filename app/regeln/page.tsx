import { redirect } from "next/navigation";
import { CheckCircle2, Goal, ListChecks, Trophy } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { requirePlayer } from "@/lib/auth";

const examples = [
  ["Spiel 2:1, Tipp 2:1", "5 Punkte", "Exakt richtig"],
  ["Spiel 2:1, Tipp 3:2", "4 Punkte", "Tendenz und Tordifferenz richtig"],
  ["Spiel 2:1, Tipp 2:0", "4 Punkte", "Tendenz und Heimtore richtig"],
  ["Spiel 1:1, Tipp 2:2", "4 Punkte", "Unentschieden und Tordifferenz richtig"],
  ["Spiel 2:1, Tipp 0:1", "0 Punkte", "Falsche Tendenz"]
];

export default async function RulesPage() {
  const player = await requirePlayer();
  if (!player) redirect("/");

  return (
    <>
      <AppHeader player={player} />
      <main className="mx-auto max-w-4xl px-4 py-6">
        <section className="rounded-2xl bg-ink p-5 text-white shadow-card">
          <p className="text-sm font-black uppercase text-white/65">Punktewertung</p>
          <h1 className="mt-2 text-3xl font-black">So wird gezählt</h1>
          <p className="mt-3 text-white/75">
            Die Wertung soll fair sein, aber einfach bleiben. Exakt richtig ist der Volltreffer, sonst zählen nur richtige Tipps mit passender Tendenz.
          </p>
        </section>

        <section className="mt-5 grid gap-3 sm:grid-cols-2">
          <article className="rounded-xl bg-sun p-4 text-amber-950 shadow-card">
            <div className="flex items-center gap-2">
              <Trophy className="h-6 w-6" />
              <h2 className="text-xl font-black">Exaktes Ergebnis</h2>
            </div>
            <p className="mt-3 text-4xl font-black">5 Punkte</p>
            <p className="mt-2 text-sm font-semibold">Wenn dein Tipp genau stimmt, gibt es insgesamt 5 Punkte.</p>
          </article>

          <article className="rounded-xl bg-white p-4 shadow-card">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-pitch" />
              <h2 className="text-xl font-black">Richtige Tendenz</h2>
            </div>
            <p className="mt-3 text-4xl font-black text-pitch">3 Punkte</p>
            <p className="mt-2 text-sm text-slate-600">Heimsieg, Unentschieden oder Auswärtssieg richtig.</p>
          </article>

          <article className="rounded-xl bg-white p-4 shadow-card">
            <div className="flex items-center gap-2">
              <ListChecks className="h-6 w-6 text-pitch" />
              <h2 className="text-xl font-black">Tordifferenz</h2>
            </div>
            <p className="mt-3 text-4xl font-black text-pitch">+1 Punkt</p>
            <p className="mt-2 text-sm text-slate-600">Zusätzlich, wenn die Tendenz stimmt und die Differenz passt.</p>
          </article>

          <article className="rounded-xl bg-white p-4 shadow-card">
            <div className="flex items-center gap-2">
              <Goal className="h-6 w-6 text-pitch" />
              <h2 className="text-xl font-black">Team-Tore</h2>
            </div>
            <p className="mt-3 text-4xl font-black text-pitch">+1 je Team</p>
            <p className="mt-2 text-sm text-slate-600">Zusätzlich, wenn die Tendenz stimmt und einzelne Team-Tore richtig sind.</p>
          </article>
        </section>

        <section className="mt-5 rounded-xl bg-white p-4 shadow-card">
          <h2 className="text-xl font-black">Beispiele</h2>
          <div className="mt-4 space-y-2">
            {examples.map(([title, points, reason]) => (
              <div key={title} className="grid gap-1 rounded-lg bg-slate-50 px-3 py-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                <span className="font-bold">{title}</span>
                <span className="rounded-full bg-pitch px-3 py-1 text-center text-sm font-black text-white">{points}</span>
                <span className="text-sm text-slate-600">{reason}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-xl bg-pitch/10 p-4 text-pitch">
          <h2 className="font-black">Wichtig</h2>
          <p className="mt-2 text-sm font-semibold">
            Beim exakten Ergebnis werden nicht alle Zusatzpunkte obendrauf gerechnet. Ein perfekter Tipp bleibt bei 5 Punkten.
          </p>
        </section>
      </main>
    </>
  );
}
