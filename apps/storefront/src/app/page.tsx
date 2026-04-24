"use client"

import { useEffect, useState } from "react"
import ProductCard from "@/components/product-card"
import { sdk } from "@/lib/sdk"

export default function HomePage() {
  const [allProducts, setAllProducts] = useState<any[]>([])
  const [query, setQuery] = useState("")

  useEffect(() => {
    sdk.store.product
      .list({ fields: "id,title,handle,thumbnail,variants.id,variants.prices,description" })
      .then((res) => setAllProducts(res.products || []))
      .catch(() => {})
  }, [])

  const filtered = query.trim()
    ? allProducts.filter((p) => {
        const q = query.toLowerCase()
        return (
          p.title?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
        )
      })
    : allProducts

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">כל הספרים</h1>

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
    </div>
  )
}
