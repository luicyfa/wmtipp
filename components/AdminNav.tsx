import Link from "next/link";

export function AdminNav() {
  return (
    <nav className="mb-5 flex gap-2 overflow-x-auto text-sm font-semibold">
      <Link href="/admin" className="rounded-full bg-ink px-4 py-2 text-white">Uebersicht</Link>
      <Link href="/admin/teilnehmer" className="rounded-full bg-white px-4 py-2 shadow-sm">Teilnehmer</Link>
      <Link href="/admin/spiele" className="rounded-full bg-white px-4 py-2 shadow-sm">Spiele</Link>
      <Link href="/admin/bonus" className="rounded-full bg-white px-4 py-2 shadow-sm">Bonus</Link>
      <Link href="/admin/import" className="rounded-full bg-white px-4 py-2 shadow-sm">Import</Link>
    </nav>
  );
}
