import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import * as jwt from "jsonwebtoken"

type OtpPayload = {
  auth_identity_id: string
  email: string
  first_name: string | null
  last_name: string | null
  purpose: string
}

export const POST = async (
  req: MedusaRequest<{ otp_token: string }>,
  res: MedusaResponse
) => {
  const { otp_token } = req.body as { otp_token?: string }

  if (!otp_token) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "otp_token is required")
  }

  const { projectConfig: { http } } = req.scope.resolve(
    ContainerRegistrationKeys.CONFIG_MODULE
  )
  const secret = (http as any).jwtSecret || process.env.JWT_SECRET || "supersecret"

  let payload: OtpPayload
  try {
    payload = jwt.verify(otp_token, secret) as OtpPayload
  } catch {
    throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Invalid or expired OTP token")
  }

  if (payload.purpose !== "seller-bridge") {
    throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Invalid token purpose")
  }

  // Generate a short-lived member JWT for this auth_identity_id.
  // actor_id is empty — no member entity exists yet.
  // The vendor onboarding will call POST /vendor/sellers (allowUnregistered: true)
  // which creates the member entity and links it to auth_identity_id.
  const member_token = jwt.sign(
    {
      actor_id: "",
      actor_type: "member",
      auth_identity_id: payload.auth_identity_id,
      app_metadata: {},
    },
    secret,
    { expiresIn: "15m" }
  )

  res.json({
    token: member_token,
    email: payload.email,
    first_name: payload.first_name,
    last_name: payload.last_name,
  })
}
