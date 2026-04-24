import Medusa from "@medusajs/js-sdk"

// Server-side: calls from Next.js server → Medusa backend (internal Docker network)
export const serverSdk = new Medusa({
  baseUrl: process.env.MEDUSA_BACKEND_URL || "http://localhost:9000",
  publishableKey: process.env.PUBLISHABLE_KEY || "pk_823e1c8c34a62d70030c326c79abbafdd80f117cacc3be366f89e1397c772caa",
})
