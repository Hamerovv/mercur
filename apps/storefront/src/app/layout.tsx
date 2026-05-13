import type { Metadata } from "next"
import "./globals.css"
import { CartProvider } from "@/context/cart"
import { AuthProvider } from "@/context/auth"
import Nav from "@/components/nav"

export const metadata: Metadata = {
  title: "בוקשוק",
  description: "חנות הספרים שלך",
  icons: {
    icon: "/bookshook-logo.png",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <AuthProvider>
          <CartProvider>
            <Nav />
            <main className="min-h-screen bg-gray-50">{children}</main>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
