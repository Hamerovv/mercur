import { authenticate } from "@medusajs/framework"
import { MiddlewareRoute } from "@medusajs/medusa"

import { storeCartsMiddlewares } from "./carts/middlewares"
import { storeOrderGroupsMiddlewares } from "./order-groups/middlewares"
import { storeProductsMiddlewares } from "./products/middlewares"
import { storeSellersMiddlewares } from "./sellers/middlewares"

export const storeMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/store/seller-bridge",
    method: ["POST"],
    middlewares: [
      authenticate("customer", ["session", "bearer"]),
    ],
  },
  ...storeCartsMiddlewares,
  ...storeOrderGroupsMiddlewares,
  ...storeProductsMiddlewares,
  ...storeSellersMiddlewares,
]
