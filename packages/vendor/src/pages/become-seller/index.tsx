import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Spinner } from "@medusajs/icons"
import { Text } from "@medusajs/ui"

declare const __BACKEND_URL__: string

const REGISTER_DRAFT_KEY = "mercur_register_draft"

export function BecomeSeller() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const otp = searchParams.get("otp")
    if (!otp) {
      navigate("/login", { replace: true })
      return
    }

    async function redeem() {
      try {
        const redeemRes = await fetch(`${__BACKEND_URL__}/vendor/seller-bridge`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ otp_token: otp }),
        })

        if (!redeemRes.ok) {
          const body = await redeemRes.json().catch(() => ({}))
          throw new Error((body as any).message || "Invalid OTP")
        }

        const { token, email, first_name, last_name } = await redeemRes.json()

        // Exchange member JWT for a session cookie
        const sessionRes = await fetch(`${__BACKEND_URL__}/auth/session`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        })

        if (!sessionRes.ok) {
          throw new Error("Failed to create session")
        }

        // Store identity so onboarding wizard can pre-fill name fields
        sessionStorage.setItem(
          REGISTER_DRAFT_KEY,
          JSON.stringify({ first_name, last_name, email })
        )

        navigate("/onboarding", {
          replace: true,
          state: { email, first_name, last_name },
        })
      } catch (err: any) {
        setError(err?.message || "הקישור אינו תקין או פג תוקפו")
      }
    }

    redeem()
  }, [])

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Text className="text-ui-fg-error">{error}</Text>
        <button
          onClick={() => navigate("/login")}
          className="text-ui-fg-interactive underline text-sm"
        >
          חזור לכניסה
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <Spinner className="animate-spin text-ui-fg-interactive" />
      <Text className="text-ui-fg-subtle">מעביר לתהליך ההצטרפות כמוכר...</Text>
    </div>
  )
}

export default BecomeSeller
