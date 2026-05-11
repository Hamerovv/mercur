"use client"
import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { sdk } from "@/lib/client-sdk"

type Customer = { id: string; email: string; first_name?: string; last_name?: string }
type AuthContextType = {
  customer: Customer | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refresh = async () => {
    try {
      const { customer } = await sdk.store.customer.retrieve()
      setCustomer(customer as Customer)
    } catch {
      setCustomer(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  const login = async (email: string, password: string) => {
    const { token } = await sdk.auth.login("customer", "emailpass", { email, password }) as { token: string }
    if (token) {
      await sdk.client.fetch("/auth/session", { method: "POST", headers: { Authorization: `Bearer ${token}` } })
    }
    await refresh()
  }

  const register = async (email: string, password: string, firstName: string, lastName: string) => {
    const { token } = await sdk.auth.register("customer", "emailpass", { email, password }) as { token: string }
    if (token) {
      await sdk.client.fetch("/auth/session", { method: "POST", headers: { Authorization: `Bearer ${token}` } })
    }
    await sdk.store.customer.update({ first_name: firstName, last_name: lastName })
    await refresh()
  }

  const logout = async () => {
    await sdk.auth.logout()
    setCustomer(null)
  }

  return (
    <AuthContext.Provider value={{ customer, isLoading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be inside AuthProvider")
  return ctx
}
