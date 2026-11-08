# GitHub + Vercel + Neon

This repository contains the React/TypeScript frontend, Python/FastAPI API,
PostgreSQL models, migrations, Docker setup, tests, and university presentation materials.

## Hosting layout

- Vercel builds `frontend/package.json` with `vercel-build` and serves static assets.
- `/api/*` routes to the ASGI app in `api/index.py`, which imports the existing FastAPI backend.
- Neon PostgreSQL stores reports, messages, credentials, sessions, rate limits, and encrypted evidence.
- `STORAGE_BACKEND=database` stores AES-256-GCM ciphertext in PostgreSQL `bytea`. Docker defaults to private filesystem storage and remains supported.
- Files larger than 3 MiB are transmitted as authenticated 512 KiB chunks. Staged multipart data is encrypted immediately and expires after 30 minutes; expired uploads are cleaned when a new upload begins. Finalization validates all fields and file types and atomically creates the report. Download chunks also stay below the function response limit. The original 10 MiB/file and five-file limits remain.

## Required production environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon pooled connection string with `sslmode=require`; ordinary `postgresql://` is accepted |
| `ENCRYPTION_KEY` | Base64-encoded 32-byte AES key; preserve the local key if importing existing data |
| `TOKEN_PEPPER` | Preserve the local value if existing citizen tokens must continue to work |
| `STORAGE_BACKEND` | `database` |
| `SECURE_COOKIES` | `true` |
| `ALLOWED_ORIGIN` | Exact HTTPS production origin |
| `ALLOWED_ORIGINS` | Additional exact trusted origins, optional |
| `SESSION_MINUTES` | `30` |

Vercel's server-provided `VERCEL_URL` and `VERCEL_PROJECT_PRODUCTION_URL` are accepted as exact HTTPS origins. No wildcard Vercel domains or caller-supplied Host headers grant origin access. CSRF/session checks remain enforced.

Do not use a local demo password for the hosted site. Rotate demo-account passwords during import and save the new credential in a local ignored file. Never put `.env`, database exports, tokens or account passwords in GitHub. No database credentials use a `VITE_` prefix or enter the browser bundle.

## Provision and migrate

1. Authenticate the GitHub CLI, Neon CLI, and Vercel CLI in the intended accounts. No credentials are committed to this repository.
2. Create a Neon project or choose the intended existing project; use `aws-eu-central-1` for a European deployment. Create an isolated schema-check branch before testing migrations, then migrate the intended production branch.
3. Use a **direct/non-pooled** Neon URL for Alembic:

   ```sh
   cd backend
   # Supply DATABASE_URL, ENCRYPTION_KEY and TOKEN_PEPPER through environment variables.
   alembic upgrade head
   ```

4. For existing Docker data, execute `scripts/export_local.py` inside the running API container with `PYTHONPATH=/app`; capture its output into a private, ignored `.cloud/` file. It exports encrypted report fields and encrypted file bytes together.
5. Run `scripts/import_neon.py PRIVATE_TRANSFER_FILE` with the direct target URL and the original encryption secrets. It refuses to overwrite a nonempty target. Supply a newly generated `DEMO_PASSWORD` to rotate `demo.*` passwords. Sessions and rate-limit state are excluded. If there is no data to import, seed explicitly with `python -m app.seed`.
6. Link a Vercel project, connect this GitHub repository, and set the required environment variables using Vercel's secret storage (CLI stdin or dashboard). Production uses the pooled Neon URL.
7. Deploy with `vercel --prod`. Migrations run explicitly before publication, never on a public API request.
8. Verify the actual deployment URL: health, officer authentication, citizen report creation, uploaded evidence/integrity, status update and anonymous reply. A successful source push or build alone does not verify hosting.

For migrations on an existing Neon project, follow its branch-first workflow and test on an isolated branch before applying production changes. Do not point the destructive test fixture at the production database.

## Local development and checks

```sh
cd backend
pip install -r requirements.txt
pytest -q
```

```sh
cd frontend
npm ci
npm run build
```

GitHub Actions runs both checks. Docker still starts with `docker compose up --build -d`; it applies all Alembic migrations before serving. Both local disk evidence and cloud database evidence use the same encryption contexts and authenticated access checks.

## Operational boundaries

This remains an independent university demonstration. It does not contact government systems. PostgreSQL ciphertext storage is a practical small-project option; large evidence libraries should move to a private object store behind the same authorization layer. The staging cleanup is opportunistic, so completely idle abandoned uploads remain until the next upload starts. Vercel/platform request metadata may be logged by the hosting provider; application code does not log tokens or report content.
