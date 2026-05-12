"use client"

import Link from "next/link"
import { useCart } from "@/context/cart"
import { useAuth } from "@/context/auth"

export default function Nav() {
  const { itemCount } = useCart()
  const { customer } = useAuth()

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <div className="flex flex-col items-center">
            <img src="/bookshook-logo.png" alt="בוקשוק" className="h-14 w-auto" />
            <p className="text-xs text-gray-500 text-center mt-1">הופכים את ספרים לזהב</p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          {customer ? (
            <Link href="/account" className="text-sm text-gray-600 hover:text-amber-600 px-2 py-1">
              החשבון שלי
            </Link>
          ) : (
            <Link href="/login" className="text-sm text-gray-600 hover:text-amber-600 px-2 py-1">
              התחברות
            </Link>
          )}
        <Link href="/cart" className="relative p-2">
          <svg
            className="w-6 h-6 text-gray-700"
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
            <span className="absolute top-0 right-0 bg-gray-900 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {itemCount}
            </span>
          )}
        </Link>
        </div>
      </div>
    </nav>
  )
}
