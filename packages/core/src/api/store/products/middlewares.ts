import {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MiddlewareRoute } from "@medusajs/medusa"

/**
 * NOTE: Seller visibility filter has been disabled because `seller` is a
 * remote-link entity in Medusa v2 and cannot be used as a direct
 * filterableField on Product — doing so causes MikroORM to throw
 * "Trying to query by not existing property Product.seller".
 *
 * The correct approach is to use remoteQuery to pre-fetch product IDs from
 * open sellers and then filter by product_id[]. This is a TODO for a future
 * iteration once we have products in the catalog.
 */
function passThrough(
  _req: MedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction
) {
  next()
}

export const storeProductsMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/store/products",
    middlewares: [passThrough],
  },
  {
    method: ["GET"],
    matcher: "/store/products/:id",
    middlewares: [passThrough],
  },
]
