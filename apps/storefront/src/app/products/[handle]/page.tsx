import { serverSdk } from "@/lib/sdk"
import { formatPrice, getVariantPrice } from "@/lib/utils"
import { notFound } from "next/navigation"
import Image from "next/image"
import AddToCart from "./add-to-cart"

export const revalidate = 60

export default async function ProductPage({
  params,
}: {
  params: { handle: string }
}) {
  let product: any = null

  try {
    const res = await serverSdk.store.product.list({
      handle: params.handle,
      fields:
        "id,title,description,thumbnail,images.url,variants.id,variants.title,variants.prices",
    })
    product = res.products?.[0]
  } catch {
    // backend may not be running in dev
  }

  if (!product) return notFound()

  const variant = product.variants?.[0]
  const price = variant ? getVariantPrice(variant) : null

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="aspect-square relative bg-gray-100 rounded-xl overflow-hidden">
          {product.thumbnail ? (
            <Image
              src={product.thumbnail}
              alt={product.title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              אין תמונה
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <h1 className="text-2xl font-bold text-gray-900">{product.title}</h1>

          {price !== null && (
            <p className="text-xl text-gray-700 mt-3">{formatPrice(price)}</p>
          )}

          {product.description && (
            <p className="text-gray-600 mt-4 leading-relaxed text-sm">
              {product.description}
            </p>
          )}

          {variant && <AddToCart variantId={variant.id} />}
        </div>
      </div>
    </div>
  )
}
