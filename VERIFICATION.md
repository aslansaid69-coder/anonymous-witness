# Verification record

Verification performed on 4 November 2026 (Asia/Almaty).

## Passed

- **14 automated tests** using FastAPI TestClient, real SQLAlchemy operations against an isolated SQLite database, actual Argon2id, AES-256-GCM, and encrypted files on disk. These are functional database-backed tests, not mocked security implementations.
- React TypeScript compilation and Vite production bundle.
- Immutable Alembic initial migration: upgrade, downgrade, and re-upgrade against SQLite.
- PostgreSQL DDL compilation from the SQLAlchemy metadata.
- Browser: fictional citizen report submission, credential confirmation, token exchange, citizen inbox and message submission.
- Browser: officer login, database-backed dashboard totals and charts, viewing the newly submitted report, seeing the citizen message, changing status to Under Review and sending a follow-up.
- Browser: English, Kazakh and Russian interface switching; mobile layout checked at 390 × 844; desktop/tablet layout checked in the default browser viewport.
- Creator credit visible in the shared footer.

## Not verified in this environment

- Production HTTPS and external hosting remain outside the local demo. Docker/PostgreSQL were subsequently verified; see the update below.
- Production HTTPS, infrastructure logs, key-management service integration, malware scanning and production hosting. The delivered environment binds to loopback and uses HTTP for local demonstration.
- Native device/browser matrix, accessibility audit, load testing, or independent penetration testing.

The browser QA environment used an ephemeral SQLite database in a scratch directory; the delivered default configuration uses PostgreSQL. No real incident or personal data was submitted. A passing local suite is not a claim of production readiness or absolute anonymity.

## Update — preparation for the demonstration on 5 November 2026

- Docker Desktop daemon available; web and API images built successfully and all three Compose services started.
- Initial migrations applied successfully to PostgreSQL 16.
- All 14 automated tests passed against a separate disposable PostgreSQL database.
- Live Nginx → FastAPI → PostgreSQL checks passed: citizen submission with encrypted evidence, credential exchange, officer login, status transitions, officer question, citizen answer, evidence integrity verification and authenticated download.
- The persistent application database contains the six seeded fictional reports and an additional prepared demonstration report. Private access instructions are in the local ДОСТУПЫ.txt file, excluded from the distributable source archive.
- Ready-to-use macOS launch/stop scripts and a Russian three-person presentation script have been added.

## Origin configuration fix

The prepared local environment explicitly accepts localhost and 127.0.0.1 on ports 8080 and 5173. The Vite preview proxies to the persistent Docker app instead of an independent scratch API. Fifteen tests passed on SQLite and on the disposable PostgreSQL database. Live officer login, authenticated report listing, and logout passed at all four local addresses. An unlisted external origin was still rejected with HTTP 403. The updated API image is installed and running.

## Vercel/Neon preparation — 8 November 2026

- 17 tests passed on SQLite and on an isolated PostgreSQL 16 database. The new tests cover multi-request submission, encrypted staging, token checks, incomplete/conflicting chunks, database-backed evidence, authenticated chunk downloads and integrity checks.
- TypeScript and Vite production build passed.
- Migration 002 passed upgrade, downgrade to 001, and re-upgrade on PostgreSQL and SQLite.
- A transfer rehearsal copied all 8 existing local reports, 1 encrypted evidence file, 5 messages, 15 status records, 2 accounts and 36 audit events into a separate test database. Imported report text decrypted successfully and every evidence file passed AES-GCM/SHA-256 validation. Local application data was not overwritten.
- Vercel routing/runtime configuration, Neon connection normalization, cloud import/export utilities and GitHub Actions are prepared.
- `.env`, local credentials, private transfer data, caches and dependencies are excluded from Git.
- GitHub push and actual Neon/Vercel provisioning require account authorization. Until those succeed, no public cloud URL is verified.

## Production release — 8 November 2026

- GitHub source published to `aslansaid69-coder/anonymous-witness`; GitHub Actions checks passed.
- Vercel production READY: https://anonymous-witness.vercel.app, deployment `dpl_7R2AEDUNHCdfiX8GLC1PUVLCNTGJ`, functional commit `d6ec6b6`.
- Neon Free project `old-mouse-98041206` provisioned through the Vercel Marketplace in Frankfurt. Schema 002 applied over the direct connection. Pooled database access is configured for the application.
- Imported 8 existing reports, 1 evidence file, 5 messages, 15 history records, 2 accounts and 36 audit events. AES-GCM decryption, SHA-256 integrity and rotated account passwords verified against Neon. Sessions/rate limits were not imported.
- Live HTTPS API verified: health, unauthorized denial, officer/admin roles, original citizen token, new citizen submission, officer question, citizen response, internal-note privacy, status transitions, audit access, and secure no-store responses.
- A valid demonstration JPEG with padding was uploaded as a 5+ MiB evidence file via 512 KiB requests, then downloaded in chunks and checked against its stored SHA-256. One clearly labeled fictional verification report was retained.
- Public homepage, direct SPA routes, JavaScript and CSS return HTTP 200. Browser login showed the officer dashboard with 9 reports.
- GitHub automatic deployment integration is not enabled; see DEPLOYMENT.md. The production deployment itself is live and verified.
