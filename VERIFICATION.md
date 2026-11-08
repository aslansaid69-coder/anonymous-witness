# School Edition verification

This record replaces the legacy university-demo test record. Production cutover status is recorded after final verification.

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

Tests use an isolated database and test-only schools/accounts. No fixture is seeded into production. Live browser checks and final data counts are added below after deployment.
