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
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-amber-50 to-white border-b border-amber-100">
        <div className="max-w-7xl mx-auto px-6 py-16 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-4">
            ספרים יד שנייה באיכות גבוהה
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            גלה ספרים ממוכרים עצמאיים במחירים מדהימים — מקנה ידע, רומנים, ילדים ועוד.
          </p>
        </div>
      </section>

      {/* Catalog */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">כל הספרים</h2>
        <SearchableProductList products={products} />
      </div>
    </>
  )
}
