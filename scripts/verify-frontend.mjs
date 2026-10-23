import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";

const baseUrl = process.argv[2] ?? process.env.AQVERINE_QA_BASE_URL ?? "http://127.0.0.1:3000";
const chromePath = process.env.AQVERINE_CHROME_PATH
  ?? (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : "/usr/bin/google-chrome");
const screenshotDir = process.env.AQVERINE_QA_SCREENSHOT_DIR ?? ".qa-temp/screenshots";

if (!existsSync(chromePath)) throw new Error(`Chrome not found: ${chromePath}`);
mkdirSync(screenshotDir, { recursive: true });

const browser = await chromium.launch({ executablePath: chromePath, headless: true });
const failures = [];

async function checkPage(path, width, screenshotName) {
  const context = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("response", (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await page.goto(new URL(path, baseUrl).toString(), { waitUntil: "networkidle" });
  if (path === "/checkout") await page.getByText("Корзина пуста").waitFor();
  if (path === "/catalog") {
    for (const image of await page.locator("main article img").all()) {
      await image.scrollIntoViewIfNeeded();
      try {
        await image.evaluate((element) => element.decode());
      } catch {
        failures.push(`Catalog image failed to load at ${width}px: ${await image.getAttribute("alt")}`);
      }
    }
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  const metrics = await page.evaluate(() => ({
    width: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    title: document.title,
  }));
  if (metrics.scrollWidth > metrics.width) failures.push(`${path} at ${width}px overflows by ${metrics.scrollWidth - metrics.width}px`);
  if (errors.length) failures.push(`${path} at ${width}px: ${errors.join("; ")}`);
  if (screenshotDir && screenshotName) await page.screenshot({ path: join(screenshotDir, screenshotName), fullPage: true });
  console.log(`${path} ${width}px: ${metrics.title}; scrollWidth=${metrics.scrollWidth}`);
  return { context, page };
}

try {
  for (const width of [320, 390, 768, 1440, 2560]) {
    const { context, page } = await checkPage("/", width, `home-${width}.png`);
    if (width === 320 || width === 1440) {
      await page.getByRole("link", { name: "Личный кабинет — демо" }).click();
      await page.waitForURL("**/account");
      if (!(await page.getByText("Это открытый предпросмотр кабинета").count())) failures.push(`Account preview was not reached from header at ${width}px`);
      if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) failures.push(`Account preview overflows at ${width}px`);
      if (screenshotDir) await page.screenshot({ path: join(screenshotDir, `account-from-header-${width}.png`), fullPage: false });
    }
    await context.close();
  }

  for (const width of [320, 390, 768, 1440, 2560]) {
    const { context, page } = await checkPage("/catalog", width, `catalog-${width}.png`);
    if (width === 390) {
      await page.getByRole("button", { name: "Фильтры" }).click();
      const filters = page.getByRole("dialog", { name: "Фильтры каталога" });
      await filters.getByRole("button", { name: "Синий" }).click();
      await filters.getByRole("button", { name: "M", exact: true }).click();
      await filters.getByRole("button", { name: /Показать товары · 1/ }).click();
      if (!(await page.getByText("Найдено: 1 товар").count())) failures.push("Catalog filters did not narrow to blue size M product");
      await page.getByRole("button", { name: "Поиск товаров" }).click();
      await page.getByRole("combobox", { name: "Поиск товаров" }).fill("худи");
      if (!(await page.getByRole("option", { name: /Худи Everyday/ }).count())) failures.push("Live search did not suggest the hoodie");
      await page.getByRole("option", { name: /Худи Everyday/ }).click();
      await page.waitForURL("**/products/everyday-hoodie");
    }
    await context.close();
  }

  for (const width of [320, 390, 768, 1440, 2560]) {
    const { context, page } = await checkPage("/login", width, `login-${width}.png`);
    if (width === 390) {
      await page.getByRole("button", { name: "Продолжить в демо" }).click();
      if (await page.getByRole("alert").count() < 2) failures.push("Login validation errors were not shown");
      await page.getByLabel("Электронная почта").fill("demo@example.com");
      await page.getByLabel("Пароль", { exact: true }).fill("password123");
      await page.getByRole("button", { name: "Продолжить в демо" }).click();
      const loginStatus = page.getByRole("status");
      if (await loginStatus.count() === 0 || !(await loginStatus.first().textContent())?.includes("Вход не выполнен")) {
        failures.push(`Login demo status was not shown: ${await page.locator("form").last().innerText()}`);
      }
    }
    await context.close();
  }

  for (const width of [320, 390, 768, 1440]) {
    const { context, page } = await checkPage("/checkout", width, `checkout-empty-${width}.png`);
    if (!(await page.getByText("Корзина пуста").count())) failures.push(`Empty checkout state missing at ${width}px`);
    await context.close();
  }

  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.goto(new URL("/products/essential-t-shirt", baseUrl).toString(), { waitUntil: "networkidle" });
  await page.getByRole("group", { name: "Цвет товара" }).getByRole("button", { name: "Синий" }).click();
  if (!(await page.locator("main img[alt*='цвет синий']").count())) failures.push("Selected blue color did not update product image");
  await page.getByRole("group", { name: "Размер товара" }).getByRole("button", { name: "M", exact: true }).click();
  if (screenshotDir) await page.screenshot({ path: join(screenshotDir, "product-selected-390.png"), fullPage: true });
  await page.getByRole("button", { name: "Добавить в корзину" }).click();
  await page.getByRole("link", { name: "Посмотреть оформление" }).click();
  await page.waitForURL("**/checkout");
  await page.locator('dialog[aria-label="Корзина"]').waitFor({ state: "hidden" });
  await page.getByRole("heading", { name: "Контактные данные" }).waitFor();
  if (!(await page.getByText("Футболка Essential").count())) failures.push("Checkout lost cart item after navigation");
  if (screenshotDir) await page.screenshot({ path: join(screenshotDir, "checkout-filled-390.png"), fullPage: true });
  await page.getByRole("button", { name: "Продолжить в демо" }).click();
  if (await page.getByRole("alert").count() < 3) failures.push("Checkout validation errors were not shown");
  await context.close();

  for (const path of ["/register", "/forgot-password", "/account", "/aqverine-control/login", "/payment/success", "/payment/failure"]) {
    const { context } = await checkPage(path, 390, `${path.replaceAll("/", "-").slice(1)}-390.png`);
    await context.close();
  }
  for (const path of ["/payment/success", "/payment/failure"]) {
    const { context } = await checkPage(path, 320, `${path.replaceAll("/", "-").slice(1)}-320.png`);
    await context.close();
  }
  const admin = await checkPage("/aqverine-control", 390);
  if (!admin.page.url().endsWith("/aqverine-control/login")) failures.push("Admin route did not redirect to closed access page");
  await admin.context.close();
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Frontend browser checks passed.");
}
