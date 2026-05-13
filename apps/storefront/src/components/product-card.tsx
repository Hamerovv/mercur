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
          <button
            onClick={toggle}
            className="absolute top-2 left-2 z-10 bg-white rounded-full w-8 h-8 flex items-center justify-center shadow hover:scale-110 transition-transform"
            aria-label={liked ? "הסר ממשאלות" : "הוסף למשאלות"}
          >
            <span className={`text-lg ${liked ? "text-red-500" : "text-gray-300"}`}>
              {liked ? "❤️" : "🤍"}
            </span>
          </button>
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
