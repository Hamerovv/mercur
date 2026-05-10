---
slug: vendor-login-invalid-key
status: root_cause_found
trigger: "Vendor panel login returns invalid key after scrypt-kdf password hash fix"
created: 2026-05-10
updated: 2026-05-10
---

## Symptoms

- **Expected:** seller@bookshook.com / Vendor123! logs into vendor panel at http://localhost:7001
- **Actual:** "invalid key" error on login
- **Timeline:** Persists after scrypt-kdf fix was applied to seed.ts and docker compose down -v && up --build was run
- **Reproduction:** Open http://localhost:7001, enter seller@bookshook.com / Vendor123!, submit

## Current Focus

hypothesis: "Stale Docker build cache served old compiled seed.js with Node crypto.scrypt (salt:hex format) despite seed.ts being updated to use scrypt-kdf. Plus the symptom password Vendor123! was never seeded — seed always used Seller123!."
next_action: "apply fix"
test: null
expecting: null

## Evidence

- timestamp: 2026-05-10T20:00:00Z
  finding: "seed logs confirm seed ran successfully and created seller with password Seller123! (not Vendor123! as attempted)"
  source: "docker compose logs medusa | grep seed"

- timestamp: 2026-05-10T20:01:00Z
  finding: "provider_identity for seller@bookshook.com has hash in OLD format: 0297b852...:1afe7f4f... (salt:hex) not scrypt-kdf base64"
  source: "psql: SELECT entity_id, provider_metadata FROM provider_identity"

- timestamp: 2026-05-10T20:02:00Z
  finding: "admin@bookshook.com has correct scrypt-kdf base64 hash starting with c2NyeXB0 — created by medusa user CLI which uses emailpass provider natively"
  source: "psql: SELECT entity_id, provider_metadata FROM provider_identity"

- timestamp: 2026-05-10T20:03:00Z
  finding: "compiled seed.js in container uses old Node crypto.scrypt (salt:hex), not scrypt-kdf — Docker layer cache served stale compiled output"
  source: "docker compose exec medusa cat /app/apps/api/.medusa/server/src/scripts/seed.js | grep -A5 hashPassword"

- timestamp: 2026-05-10T20:04:00Z
  finding: "scrypt-kdf IS available in runtime container as transitive dep of @medusajs/auth-emailpass — so the require() would succeed if seed.js were correct"
  source: "docker compose exec medusa node -e 'require(scrypt-kdf).kdf(...)' — succeeds"

- timestamp: 2026-05-10T20:05:00Z
  finding: "@medusajs/auth-emailpass emailpass.js line 83: verify calls scrypt_kdf.verify(buf, password) where buf = Buffer.from(hash, 'base64') — old salt:hex format fails this verification"
  source: "docker compose exec medusa grep password /app/.medusa/server/node_modules/@medusajs/auth-emailpass/dist/services/emailpass.js"

- timestamp: 2026-05-10T20:06:00Z
  finding: "scrypt-kdf is NOT in apps/api/package.json — so it is absent from the generated server package.json — but it IS installed as transitive dep of auth-emailpass in server node_modules"
  source: "grep scrypt apps/api/package.json → no output; ls container node_modules/scrypt-kdf via auth-emailpass dep chain"

## Eliminated

- scrypt-kdf unavailable in runtime: ELIMINATED — present as transitive dep of auth-emailpass
- seed did not run: ELIMINATED — logs confirm successful execution
- auth_identity not linked: ELIMINATED — provider_identity row exists for seller@bookshook.com
- wrong auth endpoint: ELIMINATED — "Invalid key" message originates from emailpass provider verify failure

## Resolution

root_cause: |
  Two compounding issues:
  1. PASSWORD MISMATCH: The seeded password is always "Seller123!" but login was attempted with "Vendor123!". The seed.ts hardcodes "Seller123!" on line 650 and the log confirms this.
  2. STALE BUILD CACHE (root cause of hash format bug): seed.ts was updated to use scrypt-kdf but Docker's layer cache served the old compiled seed.js which still uses Node crypto.scrypt (salt:hex format). The medusa build step was cached and never recompiled seed.ts. The resulting provider_identity.provider_metadata.password is in salt:hex format which @medusajs/auth-emailpass cannot verify (it calls scrypt_kdf.verify on a base64 buffer).

fix: |
  Two changes needed:
  1. Fix password: Change seed.ts hashPassword call from "Seller123!" to "Vendor123!" (or use "Seller123!" consistently and update login credentials).
  2. Force image rebuild without cache: docker compose build --no-cache medusa so seed.ts is recompiled to seed.js with scrypt-kdf.
  3. Re-seed: docker compose down -v && docker compose up --build (volume wipe forces seed to re-run the seller creation block).

verification: "Login with seller@bookshook.com / Seller123! (or Vendor123! if password changed) returns auth token without error"

files_changed:
  - apps/api/src/scripts/seed.ts (password string if changed)
