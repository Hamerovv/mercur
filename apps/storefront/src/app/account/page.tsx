"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/context/auth"
import { sdk } from "@/lib/client-sdk"

const VENDOR_URL = process.env.NEXT_PUBLIC_VENDOR_URL || "http://localhost:7001"

type Order = { id: string; display_id: number; status: string; created_at: string; total: number }
type WishlistItem = { id: string; title: string; handle: string; thumbnail?: string | null; price?: number }

function useWishlist() {
  const [items, setItems] = useState<WishlistItem[]>([])
  useEffect(() => {
    const raw = localStorage.getItem("bookshook_wishlist")
    if (raw) setItems(JSON.parse(raw))
  }, [])
  const remove = (id: string) => {
    const next = items.filter((i) => i.id !== id)
    setItems(next)
    localStorage.setItem("bookshook_wishlist", JSON.stringify(next))
  }
  return { items, remove }
}

function BuyerTab() {
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const { items: wishlist, remove: removeWishlist } = useWishlist()

  useEffect(() => {
    sdk.store.order.list({ limit: 20 })
      .then((res) => setOrders((res as any).orders ?? []))
      .catch(() => setOrders([]))
      .finally(() => setOrdersLoading(false))
  }, [])

  const statusLabel: Record<string, string> = {
    pending: "ממתין",
    processing: "בעיבוד",
    completed: "הושלם",
    cancelled: "בוטל",
    shipped: "נשלח",
  }

  return (
    <div className="space-y-8">
      {/* Wishlist */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">רשימת המשאלות שלי</h2>
        {wishlist.length === 0 ? (
          <p className="text-gray-500 text-sm">לא שמרת ספרים עדיין. לחץ על ❤️ בכרטיס ספר כדי לשמור.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {wishlist.map((item) => (
              <div key={item.id} className="bg-white rounded-lg shadow-sm overflow-hidden relative">
                <button
                  onClick={() => removeWishlist(item.id)}
                  className="absolute top-2 left-2 z-10 bg-white rounded-full w-7 h-7 flex items-center justify-center shadow text-red-500 text-sm"
                  aria-label="הסר ממשאלות"
                >
                  ✕
                </button>
                <Link href={`/products/${item.handle}`}>
                  <div className="aspect-square bg-gray-100 flex items-center justify-center">
                    {item.thumbnail ? (
                      <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-gray-400 text-xs">אין תמונה</span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-gray-900 leading-snug">{item.title}</p>
                    {item.price != null && (
                      <p className="text-xs text-gray-500 mt-1">₪{(item.price / 100).toFixed(2)}</p>
                    )}
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Orders */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">ההזמנות שלי</h2>
        {ordersLoading ? (
          <p className="text-gray-400 text-sm">טוען...</p>
        ) : orders.length === 0 ? (
          <p className="text-gray-500 text-sm">אין הזמנות עדיין.</p>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg p-4 shadow-sm flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">הזמנה #{order.display_id}</p>
                  <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString("he-IL")}</p>
                </div>
                <div className="text-left">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    order.status === "completed" ? "bg-green-100 text-green-700" :
                    order.status === "cancelled" ? "bg-red-100 text-red-700" :
                    "bg-amber-100 text-amber-700"
                  }`}>
                    {statusLabel[order.status] ?? order.status}
                  </span>
                  <p className="text-sm font-semibold text-gray-900 mt-1">₪{(order.total / 100).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function SellerTab() {
  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
        <p className="text-2xl mb-2">📚</p>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">ניהול חנות הספרים שלך</h2>
        <p className="text-sm text-gray-600 mb-4">
          נהל את המוצרים, ההזמנות והתשלומים שלך בממשק המוכר.
        </p>
        <a
          href={VENDOR_URL}
          className="inline-block bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 px-6 rounded-lg transition"
        >
          כניסה לממשק המוכר
        </a>
      </div>
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-2">רוצה להתחיל למכור?</h3>
        <p className="text-sm text-gray-600 mb-3">
          אם עדיין לא נרשמת כמוכר, לחץ כדי להתחיל את תהליך ההצטרפות.
        </p>
        <a
          href={`${VENDOR_URL}/onboarding`}
          className="inline-block text-amber-600 hover:underline text-sm font-medium"
        >
          הצטרפות כמוכר ←
        </a>
      </div>
    </div>
  )
}

export default function AccountPage() {
  const { customer, isLoading, logout } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState<"buyer" | "seller">("buyer")

  useEffect(() => {
    if (!isLoading && !customer) {
      router.push("/login")
    }
  }, [customer, isLoading, router])

  if (isLoading || !customer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">טוען...</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            שלום, {customer.first_name || customer.email}
          </h1>
          <p className="text-sm text-gray-500">{customer.email}</p>
        </div>
        <button
          onClick={async () => { await logout(); router.push("/") }}
          className="text-sm text-gray-500 hover:text-red-600 transition"
        >
          יציאה
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {(["buyer", "seller"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition ${
              tab === t
                ? "border-amber-500 text-amber-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "buyer" ? "קונה" : "מוכר"}
          </button>
        ))}
      </div>

      {tab === "buyer" ? <BuyerTab /> : <SellerTab />}
    </div>
  )
}
