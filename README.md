# Anonymous Witness

**Created by Aslan Saidakhmet, Davlatbek, Dinmukhamed**

An independent university demonstration for Kazakhstan. React + TypeScript + Tailwind + React Router, FastAPI, PostgreSQL, SQLAlchemy, Alembic, AES-256-GCM, and Argon2id. All displayed sample incidents are fictional. This app does not contact police, government infrastructure, analytics services, or external identity providers.

## Vercel and Neon hosting

The application is live at **https://anonymous-witness.vercel.app** with its PostgreSQL database hosted on Neon. The existing 8 reports, messages, status history, audit log and encrypted evidence were transferred and verified. A fictional cloud verification report was added during end-to-end testing. The cloud API stores evidence encrypted in PostgreSQL and transfers large files in bounded chunks. See [DEPLOYMENT.md](DEPLOYMENT.md) for deployment details. Cloud credentials are in the local ignored `CLOUD-ДОСТУПЫ.txt`, not in this repository.

## Prepared demonstration on this Mac

The project has now been built and verified with Docker and PostgreSQL. For the prepared local environment, open Docker Desktop and then double-click `ЗАПУСТИТЬ ПРОЕКТ.command`. No terminal commands or dependency downloads are needed for the normal demonstration launch. The launch script opens http://localhost:8080 after the API is ready. Services are left running with restart policies.

Russian instructions: `ЗАВТРА — ПОРЯДОК ПОКАЗА.md`. Presentation script for three speakers: `ТЕКСТ ВЫСТУПЛЕНИЯ.md` or `ТЕКСТ ДЛЯ ЧТЕНИЯ.txt`. Local demonstration credentials are in `ДОСТУПЫ.txt`; that file and `.env` are excluded from the distributable archive. The prepared Docker images, volumes and local credentials belong to this Mac and are not transferred by the source ZIP.

## Run locally

Install Docker Desktop (with its daemon running), Docker Compose v2, and Python 3.10+ for the one-time secret generator.

From this directory:

```sh
python3 setup.py
docker compose up --build -d
docker compose exec api python -m app.seed
```

Open **http://localhost:8080**. Use `localhost`, rather than `127.0.0.1`, because the configured request origin is checked exactly. Initial builds download dependencies and PostgreSQL. The API waits for the database and applies migrations before serving. Seed is explicit and idempotent: it adds two demonstration accounts and six fictional reports only when no reports exist.

| Demonstration account | Role | Password |
| --- | --- | --- |
| `demo.admin` | Administrator | `DEMO_PASSWORD` in your generated `.env` |
| `demo.officer` | Officer | `DEMO_PASSWORD` in your generated `.env` |

Passwords and encryption keys are generated uniquely on your computer. There is no shared default credential. Seeded reports have random unrecoverable citizen tokens; create a new report to demonstrate the citizen inbox. The generated `.env` is private and ignored by Git. Back it up securely together with database and evidence backups: losing the encryption key destroys access to encrypted content, and changing the token pepper invalidates tokens and sessions. `setup.py` refuses to overwrite an existing file.

To stop without deleting data:

```sh
docker compose down
```

PostgreSQL and encrypted evidence persist in named Docker volumes. Only the web service is exposed, bound to loopback. The database and API are private to the Compose network. Do not run the test suite against your application database: the test fixture drops and recreates tables.

## Demonstration walkthrough

1. Select English, Қазақша, or Русский. Only the language preference is saved in local storage.
2. Submit a fictional report with a category, description (20–10,000 characters), approximate date/time, location, and optionally evidence.
3. Copy or download the report ID and secret token on the confirmation page. They appear once; the token cannot be recovered. Neither credential is placed in a URL or application log.
4. Open the citizen inbox. Sign out, then return through **Check report** with the saved credentials to show that access persists.
5. Open **Officer portal** and sign in. The dashboard computes totals and charts from database records. Search and filter reports by category, status, incident dates, description/ID, and location.
6. Open the new report. Move **Submitted → Under Review → Additional Information Requested**; send a question. Internal notes are separate and never returned in the citizen API.
7. Return to **Check report**, open the same report, read the question, and send an anonymous response. Refresh the officer report to see it.
8. Open an uploaded evidence file and select **Verify integrity**. The backend decrypts it, authenticates the GCM tag, and compares its SHA-256 digest before returning any bytes. Images and videos can be previewed; PDFs download for inspection.
9. View the audit log and account settings. Administrators can inspect system configuration; both roles can change their own passwords. Password changes invalidate all sessions for that account.

The citizen and officer sessions can coexist in one browser. Each lasts 30 minutes and is independently revocable. Sign out of each workspace separately when sharing a demonstration computer.

## Project structure

```text
backend/
  app/config.py        Validated environment configuration
  app/db.py            Database engine and scoped sessions
  app/models.py        Tables, constraints, indexes, relationships
  app/security.py      AES-GCM, Argon2id, HMAC and random credentials
  app/schemas.py       Input validation
  app/main.py          REST API, access control, files, audit, rate limits
  app/seed.py          Explicit demonstration seed
  migrations/          Alembic configuration and immutable initial migration
  tests/               Unit and database-backed API integration tests
frontend/
  src/api.ts           Typed API client and CSRF headers
  src/i18n.tsx         English, Kazakh and Russian interface dictionaries
  src/main.tsx         Citizen and officer routes and components
  src/style.css        Responsive navy/white interface and Tailwind
  nginx.conf           Same-origin API proxy and security headers
compose.yaml           PostgreSQL, API, web and persistent volumes
database-schema.sql    Reference PostgreSQL DDL; use Alembic to migrate
ARCHITECTURE.md         Diagram, trust boundaries and data protection
VERIFICATION.md         Checks performed and environment limitations
```

## Tests

The API test suite creates a temporary SQLite database by default, without Docker:

```sh
cd backend
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
pytest -q
```

Tests generate their own encryption key and token pepper and isolate evidence in a temporary directory. They cover submission and invalid data, credential access, Argon2 login, RBAC, CSRF/origin checks, session expiry, logout, password revocation, encryption/context binding/tampering, file restrictions and size, evidence integrity and report isolation, messaging/internal-note privacy, status transitions, filters, security headers, and rate limits.

Run the same suite against a **separate disposable PostgreSQL database** to verify the deployment database engine:

From the project root, with the Compose services running:

```sh
sh test-postgres.sh
```

The test database is disposable. The script creates it if needed and only targets `witness_test`. It never deletes the main `witness` database.

Frontend compile and bundle:

```sh
cd frontend
npm ci
npm run build
```

For frontend development with Node.js 22, keep the Compose services running, then run `npm run dev` from `frontend`. Vite serves http://127.0.0.1:5173 and proxies `/api` to the persistent Docker app on port 8080, so credentials and reports match the main site. The generated local `.env` explicitly allows localhost and 127.0.0.1 on ports 8080 and 5173. For deployment, configure only the intended exact origins; unlisted origins remain rejected. If developing the API separately on port 8000, update the Vite proxy target and API origin configuration together.

## Deployment boundary

This deliverable is a **local demonstration**, not a production law enforcement service. Local HTTP requires `SECURE_COOKIES=false`; secure cookies default to true in application code. For any real deployment, terminate HTTPS at a trusted reverse proxy, set `ALLOWED_ORIGIN` to its exact HTTPS origin and `SECURE_COOKIES=true`, restrict service networking, use managed secrets, review retention and access policies, and perform an independent security assessment. The published university demonstration uses Vercel HTTPS and Neon; it remains a demonstration, not an operational law enforcement service.

Reports, messages, locations, original filenames, and evidence bytes are encrypted at rest. Category, status, dates/times, sizes, MIME types, hashes and audit metadata remain readable for database operations. Infrastructure still sees network metadata. This does not promise network-level anonymity or protection against a compromised server or stolen encryption key. Evidence metadata is not automatically stripped. The upload allowlist and signature checks do not replace malware scanning; only simulated files belong in this prototype. The app deliberately does not embed PDFs or execute attachments in the page.

Rate limits are persisted atomically in the database and keyed by an HMAC of the connecting address. The shipped Nginx proxy is a single peer for the API, so its limits are shared by the local demo. For multi-user deployment, establish an explicitly trusted proxy chain and a reviewed client-address policy before enabling per-client limits. The API deliberately ignores untrusted forwarded headers. Access logs are disabled in Nginx and the shipped Uvicorn command; infrastructure logging remains the deployer's responsibility. Audit records describe administrative actions without storing report text or credentials, but are not a tamper-proof ledger against database administrators.

Interface strings support all three languages. Report content is displayed as entered and is never sent to a translation service. Native browser date/file controls follow the browser's own locale. Timestamps use the Asia/Almaty timezone.
