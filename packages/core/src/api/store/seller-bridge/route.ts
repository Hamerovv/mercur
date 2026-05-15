import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import * as jwt from "jsonwebtoken"

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { actor_id: customerId, auth_identity_id } = req.auth_context ?? {}

  if (!customerId || !auth_identity_id) {
    throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Not authenticated as customer")
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: customers } = await query.graph({
    entity: "customer",
    fields: ["email", "first_name", "last_name"],
    filters: { id: customerId },
  })

  const customer = customers[0]
  if (!customer) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Customer not found")
  }

  const { projectConfig: { http } } = req.scope.resolve(
    ContainerRegistrationKeys.CONFIG_MODULE
  )
  const secret = (http as any).jwtSecret || process.env.JWT_SECRET || "supersecret"

  const otp_token = jwt.sign(
    {
      auth_identity_id,
      email: customer.email,
      first_name: customer.first_name ?? null,
      last_name: customer.last_name ?? null,
      purpose: "seller-bridge",
    },
    secret,
    { expiresIn: "10m" }
  )

  res.json({ otp_token })
}
