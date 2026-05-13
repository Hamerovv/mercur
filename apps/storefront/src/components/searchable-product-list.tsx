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
      <div className="mb-10">
        <div className="relative max-w-xl">
          <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש לפי שם ספר או מחבר..."
            className="w-full border border-gray-200 rounded-2xl pr-12 pl-5 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300 bg-white shadow-sm transition"
            dir="rtl"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <svg className="w-16 h-16 text-amber-200 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p className="text-gray-400 text-lg">
            {query ? "לא נמצאו ספרים התואמים לחיפוש." : "אין ספרים להצגה כרגע."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </>
  )
}
