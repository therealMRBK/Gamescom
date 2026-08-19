# gamescom 2026 Command Center

Internes, passwortgeschütztes Mastertool für die Messe-Planung der gamescom 2026 (23.–30. August 2026, Köln). Mobile-first, für den Einsatz auf dem Smartphone in der Halle optimiert.

## Funktionen

- **Publisher & Outreach-Tracker** – Tabellen- und Kanban-Ansicht aller Publisher-Kontakte, Statushistorie, Filter nach Priorität/Status/Kanal
- **Terminplan** – Tages- und Wochenansicht (23.–30.08.2026), Drag & Drop zum Verschieben, automatische Konflikt- und Pufferzeit-Warnung, Druck-/PDF-Ansicht pro Tag
- **Team-Management** – Verfügbarkeit pro Messetag, Zuweisung von Terminen, persönliche Tagesansicht je Teammitglied
- **Content-Pipeline** – Format & Status pro Termin, Embargo-Feld mit Warnung bei zu früher Veröffentlichung
- **Dashboard** – Heute-Widget, Prioritäts-Publisher ohne Termin, Kennzahlen
- **KI-Funktionen** (optional, benötigt `ANTHROPIC_API_KEY`) – Content-Entwürfe pro Termin, Outreach-E-Mail-Entwürfe, tägliches KI-Briefing auf dem Dashboard, Prioritäts-/Kategorie-Vorschlag beim Anlegen neuer Publisher-Einträge
- **Postfach-Scan** (optional, benötigt `ANTHROPIC_API_KEY` + `IMAP_ENCRYPTION_KEY`) – jede:r Nutzer:in kann in den persönlichen Einstellungen (📬) ein eigenes IMAP-Postfach verbinden; auf Knopfdruck durchsucht die App die letzten 30 Tage nach gamescom-Einladungen und schlägt Termin sowie Antwort-E-Mail vor. Bereits geprüfte Mails werden pro Postfach zwischengespeichert, ein erneuter Scan prüft nur neu eingetroffene Mails. Der KI-Prompt für den Antwort-Entwurf ist direkt editierbar, ebenso der generierte Entwurf selbst. Kein Hintergrund-Sync, nichts wird automatisch angelegt oder verschickt.
- **Terminvorschläge** – beim Anlegen eines neuen Termins schlägt die App passende freie Slots vor, basierend auf bestehenden Terminen, Pufferzeiten und der Nähe zur Halle des jeweils vorigen/nächsten Termins (nutzt das Hallen-Schema, siehe unten).
- **Hallenplan** (🗺️) – schematische, interaktive Übersicht der Messehallen mit einfacher Routensuche zwischen zwei Hallen. Bewusst kein exaktes Architektur-Wegeleitsystem, sondern ein grobes Nachbarschaftsmodell (zentraler Boulevard, Business Area, Randbereiche) auf Basis öffentlicher Hallenplan-Infos.

## Tech-Stack

- **Next.js 16** (App Router, TypeScript, Server Actions)
- **PostgreSQL** + **Prisma ORM**
- **Auth.js (NextAuth v5)** mit Credentials-Login (E-Mail/Passwort), Rollen `ADMIN`/`EDITOR`
- **Tailwind CSS**, mobile-first
- **Docker** + **docker-compose** (App-Container + Postgres-Container mit persistentem Volume)

## Schnellstart mit Docker (empfohlen)

Voraussetzung: Docker + Docker Compose installiert.

```bash
cp .env.example .env
# .env öffnen und AUTH_SECRET, ADMIN_PASSWORD setzen (siehe unten)

docker compose up --build
```

Die App ist danach unter **http://localhost:3333** erreichbar. Beim ersten Start:

1. Postgres-Container startet und legt die Datenbank an (Daten liegen im Docker-Volume `gamescom_db_data` – bleiben bei Neustarts erhalten)
2. Die Datenbank-Migrationen werden automatisch ausgeführt (`prisma migrate deploy`)
3. Die Seed-Daten (Admin-Account + alle Publisher aus der Vorbefüllung) werden automatisch angelegt – der Seed-Lauf ist idempotent, bei Neustarts werden keine Duplikate erzeugt

**Admin-Login** (aus `.env`, Standardwerte in `.env.example`):

- E-Mail: `admin@example.com`
- Passwort: der Wert von `ADMIN_PASSWORD` in eurer `.env`

Weitere Teammitglieder legt der Admin danach direkt in der App unter **⚙️ (oben rechts) → Teammitglieder verwalten** an.

Zum Beenden: `docker compose down` (Daten bleiben erhalten). Zum vollständigen Zurücksetzen inkl. Daten: `docker compose down -v`.

## Umgebungsvariablen (`.env`)

| Variable         | Beschreibung                                                        |
| ---------------- | --------------------------------------------------------------------- |
| `DATABASE_URL`   | Postgres-Connection-String (in Docker wird dieser Wert vom Compose-Setup automatisch auf den `db`-Container gesetzt) |
| `AUTH_SECRET`    | Zufälliger Secret-String für Sessions – erzeugen mit `openssl rand -hex 32` |
| `NEXTAUTH_URL`   | Öffentliche URL der App (z. B. `http://localhost:3000` oder eure Domain) |
| `ADMIN_EMAIL`    | E-Mail des initialen Admin-Accounts (Seed)                            |
| `ADMIN_PASSWORD` | Passwort des initialen Admin-Accounts (Seed) – unbedingt ändern!      |
| `ADMIN_NAME`     | Anzeigename des initialen Admin-Accounts                              |
| `ANTHROPIC_API_KEY` | Optional – aktiviert die KI-Funktionen (Content-Entwürfe, E-Mail-Entwürfe, Briefing, Prioritäts-Vorschlag, Postfach-Scan). Ohne Key funktioniert die App normal, die KI-Buttons zeigen einen Fehlerhinweis. |
| `IMAP_ENCRYPTION_KEY` | Optional – erforderlich, um in den persönlichen Einstellungen ein IMAP-Postfach zu verbinden (verschlüsselt das gespeicherte Passwort). 32 Byte, base64 – erzeugen mit `openssl rand -base64 32`. |

## Lokale Entwicklung ohne Docker

Voraussetzung: Node.js 20+, eine erreichbare PostgreSQL-Instanz.

```bash
npm install
cp .env.example .env
# DATABASE_URL in .env auf eure lokale Postgres-Instanz anpassen

npx prisma migrate deploy   # Schema anlegen
npx tsx prisma/seed.ts      # Admin + Publisher-Seed-Daten anlegen

npm run dev
```

App läuft dann unter http://localhost:3000.

### Nützliche Befehle

```bash
npx prisma studio         # Datenbank-GUI zum Ansehen/Bearbeiten der Daten
npx prisma migrate dev    # neue Migration nach Schema-Änderung erzeugen
npm run build && npm start  # Produktions-Build lokal testen
```

## Rollen

- **Admin**: kann alles anlegen/bearbeiten, verwaltet Teammitglieder unter `/admin/users`
- **Redakteur:in**: kann Publisher, Termine und Content-Status bearbeiten, die eigene Verfügbarkeit pflegen; Teammitglieder-Verwaltung ist Admin vorbehalten

## Deployment

Das Setup ist für den Betrieb als Docker-Container ausgelegt (App-Image + separater Postgres-Container mit Volume für persistente Daten). Für Produktivbetrieb:

- `AUTH_SECRET` und `ADMIN_PASSWORD` durch starke, zufällige Werte ersetzen
- `NEXTAUTH_URL` auf die tatsächliche öffentliche URL setzen
- Bei Betrieb hinter einem Reverse Proxy (empfohlen für HTTPS) den Proxy vor den `app`-Container auf Port 3000 schalten
- Regelmäßige Backups des Postgres-Volumes einplanen (z. B. `pg_dump` aus dem `db`-Container)

## Datenmodell (Kurzüberblick)

- `PublisherEntry` – Publisher/Outreach-Einträge inkl. `StatusHistory` (Audit-Trail bei Statuswechsel)
- `Appointment` – Termine, verknüpft mit `PublisherEntry` und mehreren `User` über `AppointmentAssignment`
- `ContentPiece` – 1:1 an einen `Appointment` gekoppelt, Format/Status/Embargo/Link
- `Availability` – Verfügbarkeit eines `User` pro Messetag
- `User` – Team-Accounts mit Rolle, Schwerpunkt (Video/Artikel/Social), Kalenderfarbe

Alle Enums (Prioritäten, Status, Kanäle etc.) sind in `prisma/schema.prisma` definiert, deutsche Anzeigetexte in `src/lib/constants.ts`.
