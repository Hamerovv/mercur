"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"
import { sdk } from "@/lib/client-sdk"

type CartItem = {
  id: string
  title: string
  quantity: number
  unit_price: number
  variant_id: string
  thumbnail?: string | null
}

type Cart = {
  id: string
  items: CartItem[]
  total: number
  currency_code: string
}

type CartCtx = {
  cart: Cart | null
  loading: boolean
  addItem: (variantId: string, quantity?: number) => Promise<void>
  removeItem: (lineItemId: string) => Promise<void>
  updateItem: (lineItemId: string, quantity: number) => Promise<void>
  itemCount: number
  setCart: (cart: Cart | null) => void
}

const CartContext = createContext<CartCtx | null>(null)
const CART_KEY = "bookshook_cart_id"

function normaliseCart(data: any): Cart {
  return {
    id: data.id,
    items: (data.items || []).map((i: any) => ({
      id: i.id,
      title: i.title,
      quantity: i.quantity,
      unit_price: i.unit_price,
      variant_id: i.variant_id,
      thumbnail: i.thumbnail,
    })),
    total: data.total || 0,
    currency_code: data.currency_code || "ils",
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchCart = useCallback(async (id: string) => {
    try {
      const { cart: data } = await sdk.store.cart.retrieve(id)
      setCart(normaliseCart(data))
    } catch {
      localStorage.removeItem(CART_KEY)
    }
  }, [])

  const createCart = useCallback(async (): Promise<string | null> => {
    try {
      const { regions } = await sdk.store.region.list()
      const { cart: data } = await sdk.store.cart.create({
        region_id: regions[0]?.id,
      })
      localStorage.setItem(CART_KEY, data.id)
      setCart(normaliseCart(data))
      return data.id
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    const id = localStorage.getItem(CART_KEY)
    if (id) fetchCart(id)
  }, [fetchCart])

  const getOrCreate = useCallback(async (): Promise<string | null> => {
    if (cart?.id) return cart.id
    const stored = localStorage.getItem(CART_KEY)
    if (stored) {
      await fetchCart(stored)
      return stored
    }
    return createCart()
  }, [cart, fetchCart, createCart])

  const addItem = useCallback(
    async (variantId: string, quantity = 1) => {
      setLoading(true)
      try {
        const id = await getOrCreate()
        if (!id) return
        await sdk.store.cart.createLineItem(id, { variant_id: variantId, quantity })
        await fetchCart(id)
      } finally {
        setLoading(false)
      }
    },
    [getOrCreate, fetchCart]
  )

  const removeItem = useCallback(
    async (lineItemId: string) => {
      if (!cart?.id) return
      setLoading(true)
      try {
        await sdk.store.cart.deleteLineItem(cart.id, lineItemId)
        await fetchCart(cart.id)
      } finally {
        setLoading(false)
      }
    },
    [cart, fetchCart]
  )

  const updateItem = useCallback(
    async (lineItemId: string, quantity: number) => {
      if (!cart?.id) return
      setLoading(true)
      try {
        await sdk.store.cart.updateLineItem(cart.id, lineItemId, { quantity })
        await fetchCart(cart.id)
      } finally {
        setLoading(false)
      }
    },
    [cart, fetchCart]
  )

  const itemCount = cart?.items?.reduce((s, i) => s + i.quantity, 0) ?? 0

  return (
    <CartContext.Provider
      value={{ cart, loading, addItem, removeItem, updateItem, itemCount, setCart }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used within CartProvider")
  return ctx
}
