import puppeteer from "puppeteer"
import path from "path"

const SCREENSHOTS_DIR = path.join(__dirname, "screenshots")

async function checkPage(
  browser: any,
  url: string,
  label: string,
  checks: (page: any) => Promise<Record<string, any>>,
) {
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })
  const jsErrors: string[] = []
  const http4xx: string[] = []
  page.on("console", (m: any) => {
    if (m.type() === "error") jsErrors.push(m.text().slice(0, 150))
  })
  page.on("pageerror", (e: any) => jsErrors.push(e.message.slice(0, 150)))
  page.on("response", (r: any) => {
    if (r.status() >= 400 && r.status() !== 401) {
      http4xx.push(`${r.status()} ${r.url().slice(0, 80)}`)
    }
  })

  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 15000 })
  } catch {}

  const result = await checks(page)
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${label}.png`), fullPage: true })

  console.log(`\n=== ${label} (${url}) ===`)
  console.log("URL:", page.url())
  Object.entries(result).forEach(([k, v]) => console.log(`${k}:`, v))
  if (http4xx.length) console.log("HTTP 4xx:", http4xx.slice(0, 5))
  if (jsErrors.length) console.log("JS errors:", jsErrors.slice(0, 5))

  await page.close()
  return { ...result, jsErrors, http4xx }
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  })

  // 1. Login page — check slogan, password field, eye toggle button
  await checkPage(browser, "http://localhost:7001/login", "vendor-login", async (page) => {
    const hasSlogan = await page.evaluate(() =>
      document.body.innerText.includes("הופכים את ספרים לזהב")
    )
    const passwordInput = await page.$('input[type="password"]')
    const hasPasswordField = passwordInput !== null
    const eyeButton = await page.$('button[aria-label="הצג סיסמה"]')
    const hasEyeButton = eyeButton !== null

    // Click eye button and check input becomes text
    if (eyeButton) {
      await eyeButton.click()
      await new Promise((r) => setTimeout(r, 300))
    }
    const inputTypeAfterToggle = await page.$eval(
      "input[autoComplete='current-password'], input[autocomplete='current-password']",
      (el: any) => el.type,
    ).catch(() => "not found")

    return { hasSlogan, hasPasswordField, hasEyeButton, inputTypeAfterToggle }
  })

  // 2. Storefront register page
  await checkPage(browser, "http://localhost:8000/register", "storefront-register", async (page) => {
    const inputs = await page.$$eval("input", (els: any[]) => els.map((e) => e.type))
    const hasPasswordField = inputs.includes("password")
    const bodyText = await page.evaluate(() => document.body.innerText)
    const hasHebrew = /[א-ת]/.test(bodyText)
    return { inputs, hasPasswordField, hasHebrew }
  })

  // 3. Vendor store-select (redirects to login if not authenticated — check logo/slogan on login)
  await checkPage(browser, "http://localhost:7001/store-select", "vendor-store-select", async (page) => {
    const hasSlogan = await page.evaluate(() =>
      document.body.innerText.includes("הופכים את ספרים לזהב")
    )
    const currentUrl = page.url()
    const bodyText = await page.evaluate(() => document.body.innerText)
    const hasHebrew = /[א-ת]/.test(bodyText)
    return { currentUrl, hasSlogan, hasHebrew }
  })

  // 4. Vendor reset-password
  await checkPage(browser, "http://localhost:7001/reset-password", "vendor-reset-password", async (page) => {
    const inputs = await page.$$eval("input", (els: any[]) => els.map((e) => e.type + "|" + e.placeholder))
    const bodyText = await page.evaluate(() => document.body.innerText)
    const hasHebrew = /[א-ת]/.test(bodyText)
    return { inputs, hasHebrew }
  })

  // 5. Storefront home
  await checkPage(browser, "http://localhost:8000", "storefront-home", async (page) => {
    const bodyText = await page.evaluate(() => document.body.innerText)
    const hasHebrew = /[א-ת]/.test(bodyText)
    const title = await page.title()
    return { title, hasHebrew }
  })

  await browser.close()
  console.log("\n=== All flows complete ===")
}

main().catch(console.error)
