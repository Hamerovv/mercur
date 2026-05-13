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

const TOKEN_KEY = "_bsh_jwt"

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

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) sdk.client.setToken(token)
    refresh()
  }, [])

  const login = async (email: string, password: string) => {
    const result = await sdk.auth.login("customer", "emailpass", { email, password })
    const token = typeof result === "string" ? result : null
    if (token) {
      sdk.client.setToken(token)
      localStorage.setItem(TOKEN_KEY, token)
    }
    await refresh()
  }

  const register = async (email: string, password: string, firstName: string, lastName: string) => {
    // Step 1: Create auth identity — JWT has actor_id: "" (no customer entity yet)
    const registerToken = await sdk.auth.register("customer", "emailpass", { email, password })
    if (registerToken) sdk.client.setToken(registerToken)
    // Step 2: Create the customer entity
    await sdk.store.customer.create({ email, first_name: firstName, last_name: lastName })
    // Step 3: Login to get fresh JWT with actor_id populated
    const loginResult = await sdk.auth.login("customer", "emailpass", { email, password })
    const token = typeof loginResult === "string" ? loginResult : null
    if (token) {
      sdk.client.setToken(token)
      localStorage.setItem(TOKEN_KEY, token)
    }
    await refresh()
  }

  const logout = async () => {
    try { await sdk.auth.logout() } catch { /* ignore */ }
    sdk.client.clearToken()
    localStorage.removeItem(TOKEN_KEY)
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
