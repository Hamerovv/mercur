"use client"

import { useState } from "react"
import { useCart } from "@/context/cart"

export default function AddToCart({ variantId }: { variantId: string }) {
  const { addItem, loading } = useCart()
  const [added, setAdded] = useState(false)

  const handleAdd = async () => {
    await addItem(variantId)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <button
      onClick={handleAdd}
      disabled={loading}
      className="mt-6 w-full bg-gray-900 text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
    >
      {loading ? "מוסיף..." : added ? "נוסף לסל ✓" : "הוסף לסל"}
    </button>
  )
}
