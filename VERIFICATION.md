# School Edition verification

Verified on 8 November 2026. Public release: https://anonymous-witness.vercel.app.

The test suite covers:
- Anonymous Case Code creation, hashed storage, encrypted messages and absence of student cookies.
- Active school filtering, one-use proof-of-work and invalid input.
- Cross-school denial for lists, case details, messages, notes, status and files.
- Owner privacy: statistics and account administration without conversation access.
- Required first-login password change, CSRF, revocation, inactive accounts, login lockout and expiration.
- TOTP enrollment, authenticator login and replay prevention.
- Metadata removal in photos and rebuilt PDFs, encrypted private blob access and type/size restrictions.
- Generic notifications addressed only to the assigned school's officers.
- Retention cleanup of closed cases, notes, messages and private files.
- Idempotent owner-only bootstrap with no demonstration accounts, schools or submissions.

Results:
- All 16 automated tests passed on the disposable SQLite test adapter. The PostgreSQL run passed 15 tests and exposed a TOTP boundary timing issue; after accepting a one-step clock window while retaining replay prevention, the affected PostgreSQL test passed. The final code also passed both GitHub CI jobs.
- Migrations 001–003 and owner-only seeding completed against isolated hosted PostgreSQL before production cutover.
- Browser verification with the isolated hosted database covered student submission, one Case Code, officer sign-in/reply, student reading the generic officer reply, owner statistics without message text, EN/RU/KK and dark mode. Reloading the student page required re-entering the code.
- Layout checks at 360, 430, 768 and 1280 pixels reported no horizontal page overflow. Mobile staff pages use one column; the laptop officer layout uses two columns.
- The protected Vercel preview verified real serverless proof-of-work submission, encrypted private Blob upload/download, metadata-stripped JPEG output and denial of another school's case/file access. Preview protection remained enabled.
- The staged production build was promoted after schema 003 completed. Production contained **0 schools, 1 owner, 0 officers with the officer role, 0 cases, 0 messages and 0 notes**. The owner is required to change the initial password.
- Public production checks passed: school API returned an empty list without cookies; manifest, icons and service worker returned successfully; the old demo login was denied; the owner could sign in but could not open the overview before changing the password; an owner session did not authorize officer endpoints. The initial owner password was preserved for the user.

Push payload routing and privacy were tested with a controlled test adapter. Actual notification delivery depends on the officer enabling browser permission and was not exercised with a real officer subscription. No production test submission or school was created. Test fixtures belong only to the isolated staging database and are removed after verification.
