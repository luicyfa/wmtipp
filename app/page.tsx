import { redirect } from "next/navigation";
import Image from "next/image";
import { loginAction } from "@/app/actions";
import { getSession } from "@/lib/auth";
import { getSetupStatus } from "@/lib/env";

const errors: Record<string, string> = {
  "falsche-pin": "Die PIN passt leider nicht. Versuch es einfach nochmal.",
  "nutzer-nicht-gefunden": "Den Namen kenne ich noch nicht. Vielleicht wurde er anders angelegt?",
  "nutzer-deaktiviert": "Dieser Teilnehmer ist gerade nicht aktiv. Frag am besten kurz den Admin.",
  "ungueltige-eingaben": "Bitte gib deinen Namen und deine 4- bis 6-stellige Familien-PIN ein.",
  session: "Bitte melde dich nochmal an, dann geht es direkt weiter."
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getSession()) redirect("/dashboard");
  const params = await searchParams;
  const setup = getSetupStatus();

  return (
    <main className="mex-login flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl bg-white/95 p-6 shadow-card backdrop-blur">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 h-24 w-24 overflow-hidden rounded-[1.6rem] shadow-card ring-4 ring-white">
            <Image
              src="/icon.png"
              alt="WM-Tipp App Icon"
              width={96}
              height={96}
              priority
              className="h-full w-full object-cover"
            />
          </div>
          <h1 className="text-3xl font-black text-ink">Familien-WM-Tipp</h1>
          <p className="mt-2 text-slate-600">Einloggen mit Name und Familien-PIN.</p>
        </div>
        {!setup.isReady ? (
          <div className="mb-4 rounded-xl bg-sun/25 px-4 py-3 text-sm text-amber-950">
            <p className="font-black">Setup noch nicht fertig</p>
            <p className="mt-1">Bitte in <code>.env.local</code> die Supabase-Werte eintragen:</p>
            <p className="mt-2 break-words font-mono text-xs">{setup.missing.join(", ")}</p>
          </div>
        ) : null}
        {params.error ? <p className="mb-4 rounded-xl bg-coral/10 px-4 py-3 text-sm font-semibold text-coral">{errors[params.error] ?? "Das hat gerade nicht geklappt. Versuch es bitte nochmal."}</p> : null}
        <form action={loginAction} className="space-y-4">
          <label className="block text-sm font-bold">
            Name
            <input name="name" autoComplete="username" className="focus-ring mt-2 w-full rounded-xl border border-slate-200 px-4 py-4" placeholder="z. B. Björn" />
          </label>
          <label className="block text-sm font-bold">
            PIN
            <input name="pin" type="password" inputMode="numeric" autoComplete="current-password" className="focus-ring mt-2 w-full rounded-xl border border-slate-200 px-4 py-4" placeholder="1234" />
          </label>
          <button disabled={!setup.isReady} className="focus-ring w-full rounded-xl bg-pitch px-5 py-4 font-black text-white disabled:bg-slate-300">Einloggen</button>
        </form>
      </section>
    </main>
  );
}
