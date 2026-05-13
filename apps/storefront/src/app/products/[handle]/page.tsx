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
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
        <div className="aspect-[3/4] relative bg-amber-50 rounded-2xl overflow-hidden shadow-md">
          {product.thumbnail ? (
            <Image
              src={product.thumbnail}
              alt={product.title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-amber-200 gap-3">
              <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span className="text-sm">אין תמונה</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-extrabold text-gray-900 leading-tight">{product.title}</h1>

          {price !== null && (
            <p className="text-3xl font-bold text-amber-600">{formatPrice(price)}</p>
          )}

          {product.description && (
            <p className="text-gray-600 leading-relaxed text-base border-t border-gray-100 pt-4">
              {product.description}
            </p>
          )}

          {variant && <AddToCart variantId={variant.id} />}
        </div>
      </div>
    </div>
  )
}
