"use client"

import { useState } from "react"
import ProductCard from "@/components/product-card"

type Product = {
  id: string
  title: string
  handle: string
  thumbnail?: string | null
  description?: string | null
  variants?: { prices?: { currency_code: string; amount: number }[] }[]
}

export default function SearchableProductList({ products }: { products: Product[] }) {
  const [query, setQuery] = useState("")

  const filtered = query.trim()
    ? products.filter((p) => {
        const q = query.toLowerCase()
        return (
          p.title?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
        )
      })
    : products

  return (
    <>
      <div className="mb-8">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חיפוש לפי שם ספר או מחבר..."
          className="w-full max-w-xl border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          dir="rtl"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-500">
          {query ? "לא נמצאו ספרים התואמים לחיפוש." : "אין ספרים להצגה כרגע."}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </>
  )
}
