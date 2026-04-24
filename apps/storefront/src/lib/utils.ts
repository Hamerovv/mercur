export function formatPrice(amount: number, currencyCode = "ils"): string {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: currencyCode.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amount)
}

export function getVariantPrice(
  variant: { prices?: { currency_code: string; amount: number }[] } | null | undefined,
  currencyCode = "ils"
): number | null {
  return variant?.prices?.find((p) => p.currency_code === currencyCode)?.amount ?? null
}
