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
      className="mt-6 w-full bg-amber-500 hover:bg-amber-600 text-white py-4 px-6 rounded-2xl font-bold text-lg disabled:opacity-50 transition-colors shadow-md hover:shadow-lg"
    >
      {loading ? "מוסיף..." : added ? "נוסף לסל ✓" : "הוסף לסל"}
    </button>
  )
}
