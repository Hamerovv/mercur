import { serverSdk } from "@/lib/sdk"
import ProductCard from "@/components/product-card"

export const revalidate = 60

export default async function HomePage() {
  let products: any[] = []

  try {
    const res = await serverSdk.store.product.list({
      fields: "id,title,handle,thumbnail,variants.id,variants.prices",
    })
    products = res.products || []
  } catch {
    // backend may not be running in dev
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">כל המוצרים</h1>
      {products.length === 0 ? (
        <p className="text-gray-500">אין מוצרים להצגה כרגע.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}
