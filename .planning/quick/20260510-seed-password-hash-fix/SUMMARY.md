---
slug: seed-password-hash-fix
status: complete
---

Replaced `crypto.scrypt` + `promisify` with `scrypt-kdf` in `apps/api/src/scripts/seed.ts`.
New format: `scryptKdf.kdf(password, { logN: 15, r: 8, p: 1 }).toString("base64")` —
matches exactly what `@medusajs/auth-emailpass` uses to store and verify passwords.
`scrypt-kdf` is available in `.medusa/server/node_modules/` at runtime.
