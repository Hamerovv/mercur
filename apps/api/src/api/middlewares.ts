import { defineMiddlewares } from "@medusajs/medusa";
import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework";

export default defineMiddlewares({
    routes: [
        {
            matcher: "/app*",
            middlewares: [
                (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
                    const suffix = req.path.replace(/^\/app/, "") || "/";
                    res.redirect(301, `/dashboard${suffix}`);
                },
            ],
        },
    ],
});