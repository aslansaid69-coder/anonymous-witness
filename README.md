# Anonymous Witness — School Edition

Anonymous school support with separate student, assigned-officer and owner areas.
English, Russian and Kazakh; responsive layout, dark mode and a discreet installable PWA.

- **Students:** choose an active partner school, write a message and optionally attach a cleaned JPG/PNG/PDF. No account, name, email, phone or city. A random 80-bit Case Code is the only way back to the conversation; only its HMAC is stored.
- **Officers:** owner-created accounts, forced first-login password change, optional TOTP, school-scoped cases, anonymous replies, status changes and private notes. Push notifications contain only the school name.
- **Owner:** `/owner` with independent authentication. Manage schools, officer assignments, passwords, deactivation/deletion and retention. The owner API returns statistics, never message contents or notes.

Created by Aslan Saidakhmet, Davlatbek, Dinmukhamed.

## Stack and hosting

React/TypeScript/Vite/Tailwind, FastAPI/Python 3.12, SQLAlchemy/Alembic, hosted PostgreSQL on Neon, and **private Vercel Blob**. Messages, notes, TOTP/push secrets and attachment bytes use AES-256-GCM. Passwords use Argon2id. No SQLite or local evidence storage is used by the deployed app.

The student API has **no student sessions or cookies**: the Case Code is sent in a header on each request and held only in React memory. Refreshing requires re-entry. Only language/theme preferences use browser storage. Student requests omit cookies even when staff have signed in in the same browser.

The application never records student IP addresses, user-agent identifiers or fingerprints. Spam protection uses an expiring, one-use signed proof-of-work challenge and honeypot, plus school/case/account rate counters. No third-party CAPTCHA or analytics is loaded. Expired counters are cleared on requests and by scheduled cleanup. Infrastructure providers can still process network metadata; this is explained on the public privacy page.

## Deploy step by step

1. Push this repository to GitHub, then import it into Vercel. Keep the repository root as the project root; `vercel.json` builds the frontend and Python API. Connect the Vercel GitHub App to this repository and use `main` as the production branch.
2. Attach a Neon PostgreSQL database. Use its pooled URL as `DATABASE_URL` for the app and its **direct** URL for migrations. Attach a **private** Vercel Blob store; the SDK uses the linked store's `BLOB_STORE_ID` and platform OIDC token. For execution outside Vercel, supply a read-write token through the environment.
3. Create unique encryption, token-pepper, cron and VAPID keys. Add all variables from `.env.example` to Vercel, including `OWNER_USERNAME` and a unique `OWNER_PASSWORD` of at least 16 characters. Never commit real values or prefix server secrets with `VITE_`.
4. In a Python 3.12 virtual environment, install `backend/requirements.txt`. With the **direct** database URL and the same environment keys, run:

   ```sh
   cd backend
   alembic upgrade head
   python -m app.seed
   ```

   **Migration 003 intentionally deletes the legacy crime-reporting schema and all its demo accounts/submissions.** It then creates the School Edition schema. It is irreversible; do not run it against an unrelated database. Test migrations in an isolated environment before production.

5. Deploy through the connected `main` branch (or `vercel deploy --prod` from the correctly linked directory). The seed creates exactly one owner, requires a password change on first sign-in, and refuses to overwrite an existing owner. It creates **no demo schools, officers or cases**.
6. Open `/owner`, sign in, change the temporary password, and sign in again. Optionally enable TOTP. Add real partner schools, create officers, assign them, then activate schools. Hand generated temporary passwords to officers securely. They must change them before viewing cases.
7. Officers can enable browser push notifications after signing in. Grant notification permission on a supported browser. On iOS, install the PWA on the home screen first. Keep the VAPID private key stable; replacing it invalidates existing subscriptions.
8. Verify a real workflow with a controlled test school, then remove test cases/accounts before introducing the site. Do not submit real incidents as test data.

The daily Vercel cron (`03:15 UTC`) calls `/api/cron/maintenance` with `CRON_SECRET`. It deletes closed cases after the owner-selected retention (default 30 days), messages/notes and encrypted blobs, clears expired counters/sessions and retries pending push notifications. Failed blob deletions stay in a retry queue. Cleanup is daily, so removal may occur up to one day after the configured threshold.

## Attachments

One optional file per message; maximum **3 MiB**. Photos are decoded, oriented and re-encoded into new compressed JPEGs, without EXIF/GPS, original filenames or original metadata. PDFs up to 12 pages are rasterized and rebuilt into new image-only PDFs, removing original metadata, embedded objects, scripts and annotations. Visible names/faces/written information are not automatically redacted. Only encrypted sanitized bytes enter the private Blob store. File access is checked against the case and current school assignment before server-side decryption.

## Development and tests

```sh
cd backend
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
pytest -q
```

The default tests use disposable SQLite solely as a test adapter. Set `TEST_DATABASE_URL` to a **disposable** PostgreSQL database to test the actual engine. The fixture drops and recreates tables: never supply a production database.

```sh
cd frontend
npm ci
npm run build
```

For frontend development, `npm run dev` proxies to the local API on port 8000. For local backend development use PostgreSQL and a private hosted Blob store, set exact local `ALLOWED_ORIGIN` and `SECURE_COOKIES=false` only for local HTTP. Production uses HTTPS and secure staff cookies.

## Operational details

- Messages are polled every 12 seconds while the page is visible. No long-running chat servers are needed.
- Staff sessions expire and are invalidated by password reset/change, disabling an account, deleting it, or changing school assignments.
- Owner and officer sessions are separate. First-login restrictions and school access checks are server-enforced.
- Optional TOTP has replay prevention for sign-in. An owner can reset an officer's credentials and 2FA; owner recovery needs a deliberate server-side administrator process, not public password recovery.
- The GitHub workflow runs backend tests and the frontend production build. Schema changes must be migrated explicitly before publishing code that requires them.
- Blob encryption is application-managed. Keep the encryption key safe. Do not rotate it without a data re-encryption plan.
- Push delivery depends on browser support, permission and the push service. Failures are retried; the site is **not monitored 24/7**. Student pages prominently direct immediate danger to **112**.

See `ARCHITECTURE.md`, `DEPLOYMENT.md`, and `VERIFICATION.md` for technical details and deployment evidence. Private owner credentials and `.cloud/` state are ignored by Git.
