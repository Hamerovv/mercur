import { serverSdk } from "@/lib/sdk"
import SearchableProductList from "@/components/searchable-product-list"

export const revalidate = 60

export default async function HomePage() {
  let products: any[] = []

  try {
    const res = await serverSdk.store.product.list({
      fields: "id,title,handle,thumbnail,variants.id,variants.prices,description",
    })
    products = res.products || []
  } catch {
    // backend may not be running in dev
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">כל הספרים</h1>
      <SearchableProductList products={products} />
    </div>
  )
}
