import Medusa from "@medusajs/js-sdk"

// Server-side: calls from Next.js server → Medusa backend (internal Docker network)
export const serverSdk = new Medusa({
  baseUrl: process.env.MEDUSA_BACKEND_URL || "http://localhost:9000",
  publishableKey: process.env.PUBLISHABLE_KEY || "pk_80ab1b8186df06e8f80c427f2c76e150fb00d0c42db682b74d3661ad8bdcd7bb",
})
