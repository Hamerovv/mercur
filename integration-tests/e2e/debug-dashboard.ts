import puppeteer from "puppeteer"
import path from "path"
import fs from "fs"

const SCREENSHOTS_DIR = path.join(__dirname, "screenshots")

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })

  const consoleMessages: string[] = []
  const networkErrors: string[] = []

  page.on("console", (msg) => {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`)
  })
  page.on("requestfailed", (req) => {
    networkErrors.push(`FAILED: ${req.url()} — ${req.failure()?.errorText}`)
  })
  page.on("response", (res) => {
    if (res.status() >= 400) {
      networkErrors.push(`HTTP ${res.status()}: ${res.url()}`)
    }
  })

  console.log("Navigating to http://localhost:9000/dashboard/vendors ...")
  try {
    await page.goto("http://localhost:9000/dashboard/vendors", {
      waitUntil: "networkidle2",
      timeout: 15000,
    })
  } catch (e) {
    console.log("Navigation error:", (e as Error).message)
  }

  const html = await page.content()
  const title = await page.title()
  const bodyText = await page.evaluate(() => document.body?.innerText ?? "")

  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, "dashboard-debug.png"),
    fullPage: true,
  })

  console.log("\n=== PAGE TITLE ===")
  console.log(title)

  console.log("\n=== BODY TEXT (first 2000 chars) ===")
  console.log(bodyText.slice(0, 2000))

  console.log("\n=== CONSOLE MESSAGES ===")
  consoleMessages.forEach((m) => console.log(m))

  console.log("\n=== NETWORK ERRORS ===")
  networkErrors.forEach((m) => console.log(m))

  console.log("\n=== HTML (first 3000 chars) ===")
  console.log(html.slice(0, 3000))

  // Also try root dashboard
  console.log("\n\n--- Checking /dashboard root ---")
  const page2 = await browser.newPage()
  const console2: string[] = []
  page2.on("console", (m) => console2.push(`[${m.type()}] ${m.text()}`))
  try {
    await page2.goto("http://localhost:9000/dashboard", {
      waitUntil: "networkidle2",
      timeout: 15000,
    })
  } catch (e) {
    console.log("Dashboard root error:", (e as Error).message)
  }
  const bodyText2 = await page2.evaluate(() => document.body?.innerText ?? "")
  await page2.screenshot({
    path: path.join(SCREENSHOTS_DIR, "dashboard-root.png"),
    fullPage: true,
  })
  console.log("Body text:", bodyText2.slice(0, 500))
  console2.forEach((m) => console.log(m))

  await browser.close()
}

main().catch(console.error)
