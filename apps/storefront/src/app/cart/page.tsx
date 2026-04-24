"use client"

import { useCart } from "@/context/cart"
import { formatPrice } from "@/lib/utils"
import Image from "next/image"
import Link from "next/link"

export default function CartPage() {
  const { cart, removeItem, updateItem, loading } = useCart()

  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-bold text-gray-900">הסל שלך ריק</h1>
        <p className="text-gray-500 mt-2">הוסף מוצרים כדי להתחיל</p>
        <Link
          href="/"
          className="mt-6 inline-block bg-gray-900 text-white py-2 px-6 rounded-lg font-medium hover:bg-gray-700 transition-colors"
        >
          המשך קניות
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">סל הקניות</h1>

      <div className="space-y-4">
        {cart.items.map((item) => (
          <div
            key={item.id}
            className="flex gap-4 bg-white rounded-lg p-4 shadow-sm"
          >
            <div className="w-20 h-20 relative bg-gray-100 rounded shrink-0 overflow-hidden">
              {item.thumbnail && (
                <Image
                  src={item.thumbnail}
                  alt={item.title}
                  fill
                  className="object-cover"
                />
              )}
            </div>

            <div className="flex-1">
              <h3 className="font-medium text-gray-900 text-sm">{item.title}</h3>
              <p className="text-gray-600 text-sm mt-0.5">
                {formatPrice(item.unit_price)}
              </p>

              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => updateItem(item.id, Math.max(1, item.quantity - 1))}
                  disabled={loading}
                  className="w-7 h-7 border rounded flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  −
                </button>
                <span className="text-sm w-5 text-center">{item.quantity}</span>
                <button
                  onClick={() => updateItem(item.id, item.quantity + 1)}
                  disabled={loading}
                  className="w-7 h-7 border rounded flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  +
                </button>
                <button
                  onClick={() => removeItem(item.id)}
                  disabled={loading}
                  className="mr-auto text-red-500 text-sm hover:text-red-700 disabled:opacity-50"
                >
                  הסר
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 bg-white rounded-lg p-4 shadow-sm">
        <div className="flex justify-between font-medium text-gray-900">
          <span>סה&quot;כ</span>
          <span>{formatPrice(cart.total, cart.currency_code)}</span>
        </div>
        <button className="mt-4 w-full bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors">
          מעבר לתשלום
        </button>
      </div>
    </div>
  )
}
