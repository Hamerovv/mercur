"use client"
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"

function ConfirmationInner() {
  const params = useSearchParams()
  const orderId = params.get("id")

  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center">
      <div className="text-5xl mb-4">🎉</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">ההזמנה בוצעה בהצלחה!</h1>
      <p className="text-gray-500 mb-6">תקבל עדכון כשהספרים ישלחו.</p>
      {orderId && <p className="text-xs text-gray-400 mb-6">מס׳ הזמנה: {orderId}</p>}
      <Link href="/account" className="inline-block bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 px-6 rounded-lg transition">
        לחשבון שלי
      </Link>
    </div>
  )
}

export default function OrderConfirmationPage() {
  return (
    <Suspense>
      <ConfirmationInner />
    </Suspense>
  )
}
