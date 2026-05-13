"use client"
import { useState, useEffect } from "react"
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

function useWishlistItem(product: Product) {
  const [liked, setLiked] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem("bookshook_wishlist")
    if (raw) {
      const list = JSON.parse(raw) as { id: string }[]
      setLiked(list.some((i) => i.id === product.id))
    }
  }, [product.id])

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault()
    const raw = localStorage.getItem("bookshook_wishlist")
    const list: any[] = raw ? JSON.parse(raw) : []
    let next: any[]
    if (liked) {
      next = list.filter((i) => i.id !== product.id)
    } else {
      const price = product.variants?.[0] ? getVariantPrice(product.variants[0]) : undefined
      next = [...list, { id: product.id, title: product.title, handle: product.handle, thumbnail: product.thumbnail, price }]
    }
    localStorage.setItem("bookshook_wishlist", JSON.stringify(next))
    setLiked(!liked)
  }

  return { liked, toggle }
}

export default function ProductCard({ product }: { product: Product }) {
  const price = product.variants?.[0]
    ? getVariantPrice(product.variants[0])
    : null
  const { liked, toggle } = useWishlistItem(product)

  return (
    <Link href={`/products/${product.handle}`} className="group">
      <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-amber-200 shadow-sm hover:shadow-lg transition-all duration-200">
        <div className="aspect-[3/4] relative bg-amber-50">
          {product.thumbnail ? (
            <Image
              src={product.thumbnail}
              alt={product.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-amber-300 gap-2">
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span className="text-xs">אין תמונה</span>
            </div>
          )}
          <button
            onClick={toggle}
            className="absolute top-3 left-3 z-10 bg-white/90 backdrop-blur-sm rounded-full w-8 h-8 flex items-center justify-center shadow-md hover:scale-110 transition-transform"
            aria-label={liked ? "הסר ממשאלות" : "הוסף למשאלות"}
          >
            <span className={`text-base ${liked ? "text-red-500" : "text-gray-300"}`}>
              {liked ? "❤️" : "🤍"}
            </span>
          </button>
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">
            {product.title}
          </h3>
          {price !== null && (
            <p className="text-amber-600 font-bold text-base mt-2">{formatPrice(price)}</p>
          )}
        </div>
      </div>
    </Link>
  )
}
