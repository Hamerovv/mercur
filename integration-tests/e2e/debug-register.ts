import puppeteer from "puppeteer"
import path from "path"

const SCREENSHOTS_DIR = path.join(__dirname, "screenshots")

const EMAIL = `test+${Date.now()}@bookshook.test`
const PASSWORD = "Sifrut1000"

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })

  const consoleMsgs: string[] = []
  const networkLog: Array<{ status: number; url: string; method: string; body?: string }> = []

  page.on("console", (msg) => {
    consoleMsgs.push(`[${msg.type()}] ${msg.text()}`)
  })

  // Intercept all responses to capture API calls
  page.on("response", async (res) => {
    const url = res.url()
    const status = res.status()
    const method = res.request().method()
    if (url.includes("localhost:9000") || url.includes("store") || url.includes("auth")) {
      let body = ""
      try {
        body = await res.text()
      } catch { /* ignore */ }
      networkLog.push({ status, url, method, body: body.slice(0, 500) })
    }
  })

  console.log("=== Navigating to /register ===")
  await page.goto("http://localhost:8000/register", {
    waitUntil: "networkidle2",
    timeout: 20000,
  })

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "register-before.png"), fullPage: true })
  console.log("Page title:", await page.title())

  // Fill in form
  console.log("\n=== Filling form ===")
  const inputs = await page.$$('input')
  const inputTypes = await Promise.all(inputs.map(el => el.evaluate((e: HTMLInputElement) => e.type + '|' + e.placeholder)))
  console.log("Inputs found:", inputTypes)

  // Fill by order: firstName, lastName, email, password, confirmPassword
  const textInputs = await page.$$('input[type="text"]')
  const emailInputs = await page.$$('input[type="email"]')
  const passwordInputs = await page.$$('input[type="password"]')
  console.log(`text: ${textInputs.length}, email: ${emailInputs.length}, password: ${passwordInputs.length}`)

  if (textInputs[0]) await textInputs[0].type("Hadas")
  if (textInputs[1]) await textInputs[1].type("Hamerov")
  if (emailInputs[0]) await emailInputs[0].type(EMAIL)
  if (passwordInputs[0]) await passwordInputs[0].type(PASSWORD)
  if (passwordInputs[1]) await passwordInputs[1].type(PASSWORD)

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "register-filled.png"), fullPage: true })

  // Clear network log before submit so we only see registration calls
  networkLog.length = 0

  console.log("\n=== Submitting form ===")
  await page.click('button[type="submit"]')

  // Wait for navigation or error to appear
  await new Promise(r => setTimeout(r, 5000))

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "register-after.png"), fullPage: true })

  // Capture any error message shown in UI
  const bodyText = await page.evaluate(() => document.body?.innerText ?? "")
  const currentUrl = page.url()

  console.log("\n=== CURRENT URL ===")
  console.log(currentUrl)

  console.log("\n=== PAGE TEXT (looking for errors) ===")
  // Print lines that might contain Hebrew error messages
  const lines = bodyText.split("\n").filter(l => l.trim().length > 0)
  lines.forEach(l => console.log(l))

  console.log("\n=== NETWORK CALLS (after submit) ===")
  networkLog.forEach(({ method, status, url, body }) => {
    console.log(`\n${method} ${status} ${url}`)
    if (body) console.log("  Response:", body)
  })

  console.log("\n=== CONSOLE MESSAGES ===")
  consoleMsgs.forEach(m => console.log(m))

  await browser.close()
}

main().catch(console.error)
