import puppeteer from "puppeteer"
import path from "path"

const SCREENSHOTS_DIR = path.join(__dirname, "screenshots")

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })

  const jsErrors: string[] = []
  const http400s: string[] = []

  page.on("console", (msg) => {
    if (msg.type() === "error") jsErrors.push(msg.text().slice(0, 200))
  })
  page.on("pageerror", (err) => {
    jsErrors.push(err.message.slice(0, 200))
  })
  page.on("response", (res) => {
    if (res.status() >= 400) {
      http400s.push(`${res.status()} ${res.url().slice(0, 100)}`)
    }
  })

  console.log("=== Navigating to /reset-password ===")
  try {
    await page.goto("http://localhost:7001/reset-password", {
      waitUntil: "networkidle2",
      timeout: 15000,
    })
  } catch (e: any) {
    console.log("NAV ERROR:", e.message)
  }

  console.log("URL:", page.url())
  console.log("Title:", await page.title())

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "reset-password.png"), fullPage: true })

  const inputs = await page.$$eval("input", (els) =>
    els.map((e: any) => `${e.type}|${e.name}|${e.placeholder}`)
  )
  console.log("Inputs:", JSON.stringify(inputs))
  console.log("HTTP 4xx:", JSON.stringify(http400s.slice(0, 10)))
  console.log("JS errors:", JSON.stringify(jsErrors.slice(0, 10)))

  const bodyText = await page.evaluate(() => document.body?.innerText ?? "")
  const lines = bodyText.split("\n").filter((l) => l.trim().length > 0)
  console.log("\n=== PAGE TEXT ===")
  lines.forEach((l) => console.log(l))

  await browser.close()
}

main().catch(console.error)
