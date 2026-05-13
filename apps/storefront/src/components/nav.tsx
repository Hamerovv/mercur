"use client"

import Link from "next/link"
import { useCart } from "@/context/cart"
import { useAuth } from "@/context/auth"

export default function Nav() {
  const { itemCount } = useCart()
  const { customer } = useAuth()

  return (
    <nav className="bg-white/95 backdrop-blur border-b border-amber-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <div className="flex flex-col items-center">
            <img src="/bookshook-logo.png" alt="בוקשוק" className="h-20 w-48 object-contain" />
            <p className="text-xs text-amber-600 text-center -mt-1 font-medium tracking-wide">הופכים את ספרים לזהב</p>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          {customer ? (
            <Link href="/account" className="text-sm font-medium text-gray-700 hover:text-amber-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-amber-50">
              החשבון שלי
            </Link>
          ) : (
            <Link href="/login" className="text-sm font-medium text-gray-700 hover:text-amber-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-amber-50">
              התחברות
            </Link>
          )}
          <Link href="/cart" className="relative p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 transition-colors">
            <svg
              className="w-5 h-5 text-amber-700"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow">
                {itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </nav>
  )
}
