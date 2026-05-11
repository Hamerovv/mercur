import puppeteer, { Browser, Page } from "puppeteer"
import path from "path"

const STOREFRONT_URL = process.env.STOREFRONT_URL || "http://localhost:8000"
const SCREENSHOTS_DIR = path.join(__dirname, "screenshots")

let browser: Browser
let page: Page

beforeAll(async () => {
  browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  })
  page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 800 })
})

afterAll(async () => {
  await browser.close()
})

describe("Storefront", () => {
  it("loads the homepage", async () => {
    await page.goto(STOREFRONT_URL, { waitUntil: "networkidle2" })
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "homepage.png"),
      fullPage: true,
    })
    const title = await page.title()
    expect(title).toBeTruthy()
  })
})
