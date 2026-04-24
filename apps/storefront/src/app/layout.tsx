import type { Metadata } from "next"
import "./globals.css"
import { CartProvider } from "@/context/cart"
import Nav from "@/components/nav"

export const metadata: Metadata = {
  title: "Bookshook",
  description: "חנות הספרים שלך",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <CartProvider>
          <Nav />
          <main className="min-h-screen bg-gray-50">{children}</main>
        </CartProvider>
      </body>
    </html>
  )
}
