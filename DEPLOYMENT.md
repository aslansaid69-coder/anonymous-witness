# School Edition deployment

Project: `atik24/anonymous-witness`. Repository: `aslansaid69-coder/anonymous-witness`.
The public production domain remains https://anonymous-witness.vercel.app.

Follow the complete step-by-step procedure in README.md. Use separate Neon databases for preview/testing and production. Never set the destructive test fixture's `TEST_DATABASE_URL` to production.

1. Configure the Vercel GitHub login connection and grant the Vercel GitHub App access to this repository. Connect the repo in project Git settings. Production branch: `main`.
2. Link Neon and a **private** Vercel Blob store. Keep Blob private; public unguessable URLs are not an access-control substitute.
3. Configure all `.env.example` keys in the intended Vercel environments. Keep credentials out of Git and client-side environment variables. Preview must use an isolated database.
4. Validate schema 003 and the complete school-isolation workflow in the isolated environment. Then apply 003 and seed the owner in production using the direct connection. No sample data is seeded.
5. Stage a production build without assigning domains, run migrations at cutover, and promote the staged deployment. Subsequent pushes to `main` use native Vercel Git deployments.
6. Sign in at `/owner`, change the temporary password, add real schools and assigned officers, and enable notifications/TOTP as needed. Existing legacy demo logins and report credentials no longer work.

The PWA is named **Notes** and uses a neutral icon. Its service worker caches only static resources and never handles API responses, case data or files. No third-party student trackers are configured. Public student network requests omit cookies.

`/api/cron/maintenance` requires `Authorization: Bearer CRON_SECRET`. The Hobby-compatible daily schedule is in `vercel.json`. Cleanup and push retries must remain configured; use provider logs to investigate failed delivery without logging message bodies or codes.

Use `vercel logs --deployment <url> --query 'level:error' --since 1h` to inspect runtime failures. Use authenticated `vercel curl` for protected previews; do not weaken preview protection to run tests.
