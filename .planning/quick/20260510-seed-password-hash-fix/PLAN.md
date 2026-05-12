---
slug: seed-password-hash-fix
date: 2026-05-10
status: in-progress
---

# Fix seed.ts password hashing to match Medusa emailpass provider

## Problem
Seed uses `crypto.scrypt` (Node built-in) with `${salt}:${hex}` format.
Medusa's `@medusajs/auth-emailpass` provider uses `scrypt-kdf` with base64 output
and config `{ logN: 15, r: 8, p: 1 }`. The formats are incompatible — login fails.

## Fix
Replace `hashPassword` implementation:
- Remove: `import { scrypt, randomBytes } from "crypto"` and `import { promisify } from "util"`
- Remove: `const scryptAsync = promisify(scrypt)`
- Replace `hashPassword` body with `scrypt-kdf` using `require("scrypt-kdf")`
  (available in `.medusa/server/node_modules/scrypt-kdf` at runtime)

## File
`apps/api/src/scripts/seed.ts` lines 1-2, 42-47
