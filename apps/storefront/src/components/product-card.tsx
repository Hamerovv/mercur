import Link from "next/link"
import Image from "next/image"
import { formatPrice, getVariantPrice } from "@/lib/utils"

type Product = {
  id: string
  title: string
  handle: string
  thumbnail?: string | null
  variants?: { prices?: { currency_code: string; amount: number }[] }[]
}

export default function ProductCard({ product }: { product: Product }) {
  const price = product.variants?.[0]
    ? getVariantPrice(product.variants[0])
    : null

  return (
    <Link href={`/products/${product.handle}`} className="group">
      <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <div className="aspect-square relative bg-gray-100">
          {product.thumbnail ? (
            <Image
              src={product.thumbnail}
              alt={product.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
              אין תמונה
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-medium text-gray-900 text-sm leading-snug">
            {product.title}
          </h3>
          {price !== null && (
            <p className="text-gray-600 text-sm mt-1">{formatPrice(price)}</p>
          )}
        </div>
      </div>
    </Link>
  )
}
