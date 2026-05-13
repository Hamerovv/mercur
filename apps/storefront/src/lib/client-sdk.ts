"use client"
import Medusa from "@medusajs/js-sdk"

// Client-side: browser → Medusa backend (always via localhost)
export const sdk = new Medusa({
  baseUrl: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000",
  publishableKey: process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || "pk_80ab1b8186df06e8f80c427f2c76e150fb00d0c42db682b74d3661ad8bdcd7bb",
})
