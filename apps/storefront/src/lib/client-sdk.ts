"use client"
import Medusa from "@medusajs/js-sdk"

// Client-side: browser → Medusa backend (always via localhost)
export const sdk = new Medusa({
  baseUrl: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000",
  publishableKey: process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || "pk_823e1c8c34a62d70030c326c79abbafdd80f117cacc3be366f89e1397c772caa",
})
