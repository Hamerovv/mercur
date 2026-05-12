"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useCart } from "@/context/cart"
import { sdk } from "@/lib/client-sdk"
import { formatPrice } from "@/lib/utils"

type ShippingOption = { id: string; name: string; amount: number }

export default function CheckoutPage() {
  const { cart, setCart } = useCart()
  const router = useRouter()
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [address, setAddress] = useState("")
  const [city, setCity] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([])
  const [selectedShipping, setSelectedShipping] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [step, setStep] = useState<"address" | "shipping" | "confirm">("address")

  useEffect(() => {
    if (!cart) return
    ;(sdk.store as any).fulfillment.listCartOptions({ cart_id: cart!.id })
      .then((res: any) => {
        const opts: ShippingOption[] = (res.shipping_options || []).map((o: any) => ({
          id: o.id,
          name: o.name,
          amount: o.amount ?? 0,
        }))
        setShippingOptions(opts)
        if (opts.length > 0) setSelectedShipping(opts[0].id)
      })
      .catch(() => {})
  }, [cart])

  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <p className="text-gray-500">הסל שלך ריק.</p>
      </div>
    )
  }

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      await sdk.store.cart.update(cart!.id, {
        email,
        shipping_address: {
          first_name: firstName,
          last_name: lastName,
          address_1: address,
          city,
          country_code: "il",
          phone,
        },
        billing_address: {
          first_name: firstName,
          last_name: lastName,
          address_1: address,
          city,
          country_code: "il",
          phone,
        },
      } as any)
      setStep("shipping")
    } catch {
      setError("שגיאה בשמירת הכתובת, נסה שוב")
    } finally {
      setLoading(false)
    }
  }

  const handleShippingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      await sdk.store.cart.addShippingMethod(cart!.id, {
        option_id: selectedShipping,
      })
      setStep("confirm")
    } catch {
      setError("שגיאה בבחירת משלוח, נסה שוב")
    } finally {
      setLoading(false)
    }
  }

  const handlePlaceOrder = async () => {
    setLoading(true)
    setError("")
    try {
      await (sdk.store as any).payment.initiatePaymentSession(cart!.id, {
        provider_id: "pp_system_default",
      })
      const result = await sdk.store.cart.complete(cart!.id) as any
      if (result.type === "order" && result.order?.id) {
        setCart(null)
        router.push(`/order-confirmation?id=${result.order.id}`)
      } else {
        setError("שגיאה בהשלמת ההזמנה, בדוק את הפרטים ונסה שוב")
      }
    } catch {
      setError("שגיאה בביצוע ההזמנה, נסה שוב")
    } finally {
      setLoading(false)
    }
  }

  const selectedOption = shippingOptions.find(o => o.id === selectedShipping)

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">תשלום</h1>

      <div className="flex gap-4 mb-8 text-sm">
        {(["address", "shipping", "confirm"] as const).map((s, i) => (
          <span key={s} className={`font-medium ${step === s ? "text-amber-600" : "text-gray-400"}`}>
            {i + 1}. {s === "address" ? "כתובת" : s === "shipping" ? "משלוח" : "אישור"}
          </span>
        ))}
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4">{error}</div>}

      {step === "address" && (
        <form onSubmit={handleAddressSubmit} className="space-y-4 bg-white rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900">כתובת למשלוח</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">שם פרטי</label>
              <input required value={firstName} onChange={e => setFirstName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">שם משפחה</label>
              <input required value={lastName} onChange={e => setLastName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">אימייל</label>
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">כתובת</label>
            <input required value={address} onChange={e => setAddress(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">עיר</label>
            <input required value={city} onChange={e => setCity(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">טלפון</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50">
            {loading ? "שומר..." : "המשך לבחירת משלוח ←"}
          </button>
        </form>
      )}

      {step === "shipping" && (
        <form onSubmit={handleShippingSubmit} className="space-y-4 bg-white rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900">שיטת משלוח</h2>
          {shippingOptions.length === 0 ? (
            <p className="text-gray-500 text-sm">טוען אפשרויות משלוח...</p>
          ) : (
            shippingOptions.map(opt => (
              <label key={opt.id} className="flex items-center gap-3 cursor-pointer p-3 border rounded-lg hover:bg-amber-50">
                <input type="radio" name="shipping" value={opt.id}
                  checked={selectedShipping === opt.id}
                  onChange={() => setSelectedShipping(opt.id)}
                  className="accent-amber-500" />
                <span className="flex-1 text-sm font-medium text-gray-900">{opt.name}</span>
                <span className="text-sm text-gray-600">{formatPrice(opt.amount)}</span>
              </label>
            ))
          )}
          <button type="submit" disabled={loading || !selectedShipping}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50">
            {loading ? "שומר..." : "המשך לאישור ←"}
          </button>
        </form>
      )}

      {step === "confirm" && (
        <div className="space-y-4 bg-white rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900">סיכום הזמנה</h2>
          <div className="space-y-2 text-sm">
            {cart!.items.map((item: any) => (
              <div key={item.id} className="flex justify-between text-gray-700">
                <span>{item.title} × {item.quantity}</span>
                <span>{formatPrice(item.unit_price * item.quantity)}</span>
              </div>
            ))}
            {selectedOption && (
              <div className="flex justify-between text-gray-700 border-t pt-2 mt-2">
                <span>משלוח ({selectedOption.name})</span>
                <span>{formatPrice(selectedOption.amount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-900 border-t pt-2 mt-2">
              <span>סה"כ</span>
              <span>{formatPrice(cart!.total, cart!.currency_code)}</span>
            </div>
          </div>
          <p className="text-xs text-gray-500">תשלום: מזומן/צ׳ק בעת קבלה</p>
          <button onClick={handlePlaceOrder} disabled={loading}
            className="w-full bg-gray-900 hover:bg-gray-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50">
            {loading ? "מבצע הזמנה..." : "אשר הזמנה"}
          </button>
        </div>
      )}
    </div>
  )
}
