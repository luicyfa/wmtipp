# Familien-WM-Tippspiel 2026

Private Next.js-App fuer ein Familien-Tippspiel zur Fußball-WM 2026. Login erfolgt bewusst einfach per Name + PIN, Teilnehmer werden nur durch Admins angelegt.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Postgres
- Server Actions fuer Login, Tipps, Admin und Import
- httpOnly Session-Cookie mit HMAC-Signatur
- PIN-Hashing serverseitig mit `crypto.scrypt`
- Node-Test-Runner fuer die Punktewertung

## Lokal starten

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Danach `http://localhost:3000` oeffnen.

Im lokalen WLAN starten:

```bash
pnpm dev:lan
```

Dann auf iPhones im gleichen WLAN `http://<mac-lan-ip>:3000` oeffnen, zum Beispiel `http://192.168.178.21:3000`.

Die passenden lokalen Adressen kannst du anzeigen mit:

```bash
pnpm lan:info
```

## Supabase einrichten

1. Neues Supabase-Projekt anlegen.
2. In `.env.local` setzen:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SESSION_SECRET=ein-langer-zufaelliger-geheimer-string
```

3. Migration ausfuehren, z. B. im Supabase SQL Editor:

```sql
-- Inhalt von db/migrations/001_initial_schema.sql ausfuehren
```

4. Seed-Daten laden:

```sql
-- Inhalt von db/seed.sql ausfuehren
```

Default-Logins:

- `Admin` / `1234`
- `Björn` / `1111`
- `Henry` / `2222`
- `Opa` / `3333`
- `Oma` / `4444`

Bitte die PINs nach dem ersten Login im Adminbereich aendern.

## Excel-Quelle und Import

Die Datei `/Users/bjornbochinski/Downloads/WCup_2026_4.2.6_de.xlsx` wurde mit `scripts/extract_worldcup_seed.py` ausgewertet. Daraus entstehen:

- `db/seed.sql` mit 48 Teams und 104 Spielen
- `db/worldcup_2026_matches.csv` fuer den Admin-CSV-Import

Die Anstoßzeiten werden aus der Spalte "Date (my time)" mit explizitem `+02:00` Offset uebernommen. Angezeigt wird in der App die Berliner Zeit.

CSV-Import im Adminbereich erwartet:

```csv
match_number,round,group_code,home_team_label,away_team_label,kickoff_at,venue
```

## Tests

```bash
pnpm test
```

Die Tests decken exaktes Ergebnis, Tendenz, Tordifferenz, Heim-/Auswaertstore, 0 Punkte, fehlendes Ergebnis und Sperrung ab Anstoß ab.
Der Testlauf nutzt `node:test` direkt mit TypeScript-Stripping. Das vermeidet native Rollup-Abhaengigkeiten und ist fuer die reine Scoring-Logik bewusst schlank gehalten.

## Vercel Deployment

1. Repository mit Vercel verbinden.
2. Die ENV-Variablen aus `.env.example` in Vercel setzen.
3. Supabase-Migration und Seed vorher ausfuehren.
4. Deploy starten.

Wichtig: `SUPABASE_SERVICE_ROLE_KEY` wird ausschliesslich serverseitig verwendet und darf nicht als `NEXT_PUBLIC_*` Variable gesetzt werden.

## Ergebnis-Sync per Cron

Die App enthaelt eine vorbereitete Vercel-Cron-Route:

- Route: `/api/cron/sync-results`
- Zeitplan: taeglich `0 4 * * *` UTC, also waehrend der WM um 06:00 Uhr Berliner Sommerzeit
- API-Quelle: API-FOOTBALL, sobald `API_FOOTBALL_KEY` gesetzt ist
- Wettbewerb: `API_FOOTBALL_LEAGUE_ID=1`, `API_FOOTBALL_SEASON=2026`
- Vercel-Cron-Requests werden ueber den User-Agent `vercel-cron/1.0` erkannt; manuelle Aufrufe brauchen `CRON_SECRET`

Damit der Sync echte Spiele aktualisieren kann, muss die Migration `db/migrations/005_api_football_sync.sql` ausgefuehrt werden. Der Cron zieht API-FOOTBALL-Fixtures fuer `league=1` und `season=2026`, prueft nur Spiele im relevanten Zeitfenster von 48 Stunden zurueck bis 24 Stunden nach vorn und hinterlegt passende `api_football_fixture_id`s automatisch, wenn Heimteam, Auswaertsteam und Anstoßzeit plausibel zusammenpassen. Ohne API-Key aendert der Cron nichts und gibt nur einen sauberen Hinweis zurueck.

Zum manuellen Testen:

```bash
curl -H "Authorization: Bearer <CRON_SECRET>" https://deine-domain.de/api/cron/sync-results
```

## Wichtige Dateien

- `app/actions.ts`: Server Actions fuer Auth, Tipps, Admin und Import
- `lib/auth.ts`: PIN-Hashing und Session-Cookie
- `lib/scoring.ts`: zentrale Punkteberechnung
- `lib/results.ts`: gemeinsame Ergebnis- und Bonusauswertung
- `lib/result-sync.ts`: vorbereiteter Ergebnis-Sync via API-FOOTBALL
- `lib/rankings.ts`: Ranglistenabruf ueber Supabase-RPC
- `db/migrations/001_initial_schema.sql`: Datenbankschema
- `db/seed.sql`: Startdaten aus dem Excel-Spielplan
- `tests/scoring.test.ts`: Unit Tests

## Naechste sinnvolle Schritte

- Produktionsdaten gegen offizielle finale FIFA-Daten pruefen, sobald sie endgueltig sind.
- Echten Familien-Probelauf mit zwei iPhones machen: ein Teilnehmer tippt, Admin traegt ein Ergebnis ein, Rangliste pruefen.
- Admin-Korrekturfunktion fuer Tipps mit sichtbarem Audit-Hinweis ergaenzen.
- Bonus-Tipps und editierbares Punktesystem aktivieren.
