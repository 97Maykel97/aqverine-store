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
  if (/\b0[1-9]\s*\/\s*(?=\p{L})/u.test(await page.locator("main").innerText())) failures.push(`${path} at ${width}px still shows a decorative index`);
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
      await page.evaluate(() => { window.__aqverineNavigationProbe = "preserved"; });
      await page.getByRole("link", { name: "Личный кабинет — демо" }).click();
      await page.waitForURL("**/account");
      if (!(await page.evaluate(() => window.__aqverineNavigationProbe === "preserved"))) failures.push(`Account navigation reloaded the document at ${width}px`);
      if (!(await page.getByText("Это открытый предпросмотр кабинета").count())) failures.push(`Account preview was not reached from header at ${width}px`);
      if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) failures.push(`Account preview overflows at ${width}px`);
      if (screenshotDir) await page.screenshot({ path: join(screenshotDir, `account-from-header-${width}.png`), fullPage: false });
    }
    if (width === 390 || width === 768 || width === 1440) {
      await page.getByRole("button", { name: "Открыть меню" }).click();
      const menu = page.getByRole("dialog", { name: "Меню сайта" });
      await menu.waitFor({ state: "visible" });
      const campaignImage = menu.getByRole("img", { name: "Коллекция AQVERINE в городском ритме" });
      await campaignImage.evaluate((image) => image.decode());
      await page.waitForTimeout(250);
      if (screenshotDir) await page.screenshot({ path: join(screenshotDir, `menu-${width}.png`), fullPage: false });
      await page.evaluate(() => { window.__aqverineNavigationProbe = "preserved"; });
      await menu.getByRole("link", { name: "Вся коллекция" }).click();
      await page.waitForURL("**/catalog");
      if (!(await page.evaluate(() => window.__aqverineNavigationProbe === "preserved"))) failures.push(`Menu navigation reloaded the document at ${width}px`);
      await menu.waitFor({ state: "hidden" });
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
      await page.evaluate(() => { window.__aqverineNavigationProbe = "preserved"; });
      await page.getByRole("option", { name: /Худи Everyday/ }).click();
      await page.waitForURL("**/products/everyday-hoodie");
      if (!(await page.evaluate(() => window.__aqverineNavigationProbe === "preserved"))) failures.push("Search navigation reloaded the document");
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
  await context.addInitScript(() => {
    window.__aqverineLayoutShiftScore = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__aqverineLayoutShiftScore += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  const page = await context.newPage();
  await page.goto(new URL("/products/essential-t-shirt", baseUrl).toString(), { waitUntil: "networkidle" });
  if ((await page.evaluate(() => window.__aqverineLayoutShiftScore)) > 0.1) failures.push("Product loading causes visible layout shift");
  await page.getByRole("group", { name: "Цвет товара" }).getByRole("button", { name: "Синий" }).click();
  if (!(await page.locator("main img[alt*='цвет синий']").count())) failures.push("Selected blue color did not update product image");
  await page.getByRole("group", { name: "Размер товара" }).getByRole("button", { name: "M", exact: true }).click();
  if (/\b0[1-9]\s*\/\s*(?=\p{L})/u.test(await page.locator("main").innerText())) failures.push("Product photo still shows a decorative index");
  await page.getByRole("button", { name: /Увеличить фото/ }).click();
  const zoom = page.getByRole("dialog", { name: /Фото товара/ });
  await zoom.waitFor({ state: "visible" });
  if (!(await zoom.getByRole("img", { name: /цвет синий/ }).count())) failures.push("Photo zoom did not keep the selected color");
  await zoom.getByRole("button", { name: "Закрыть увеличенное фото" }).click();
  await page.getByRole("button", { name: "Как выбрать размер" }).click();
  const fitGuide = page.getByRole("dialog", { name: "Как выбрать размер" });
  await fitGuide.waitFor({ state: "visible" });
  if (!(await fitGuide.getByText("Точные замеры этой вещи пока не опубликованы").count())) failures.push("Size guidance is missing its accuracy notice");
  await fitGuide.getByRole("button", { name: "Вернуться к выбору" }).click();
  if (screenshotDir) await page.screenshot({ path: join(screenshotDir, "product-selected-390.png"), fullPage: true });
  await page.getByRole("button", { name: "Добавить в корзину" }).click();
  const cart = page.getByRole("dialog", { name: "Корзина" });
  await cart.waitFor({ state: "visible" });
  await page.waitForTimeout(280);
  const itemBounds = await cart.locator("article").first().boundingBox();
  const recommendationBounds = await cart.getByText("ДОПОЛНИ ОБРАЗ").boundingBox();
  if (itemBounds && recommendationBounds && recommendationBounds.y - itemBounds.y - itemBounds.height > 60) failures.push("Cart has an oversized gap after its first item");
  if (screenshotDir) await page.screenshot({ path: join(screenshotDir, "cart-filled-390.png") });
  await page.evaluate(() => { window.__aqverineNavigationProbe = "preserved"; });
  await page.getByRole("link", { name: "Посмотреть оформление" }).click();
  await page.waitForURL("**/checkout");
  if (!(await page.evaluate(() => window.__aqverineNavigationProbe === "preserved"))) failures.push("Cart to checkout navigation reloaded the document");
  await page.locator('dialog[aria-label="Корзина"]').waitFor({ state: "hidden" });
  await page.getByRole("heading", { name: "Контактные данные" }).waitFor();
  if (!(await page.getByText("Футболка Essential").count())) failures.push("Checkout lost cart item after navigation");
  if (screenshotDir) await page.screenshot({ path: join(screenshotDir, "checkout-filled-390.png"), fullPage: true });
  await page.getByRole("button", { name: "Продолжить в демо" }).click();
  if (await page.getByRole("alert").count() < 3) failures.push("Checkout validation errors were not shown");
  await context.close();

  for (const width of [320, 1440]) {
    const cartContext = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 1 });
    const cartPage = await cartContext.newPage();
    await cartPage.goto(new URL("/products/essential-t-shirt", baseUrl).toString(), { waitUntil: "networkidle" });
    await cartPage.getByRole("group", { name: "Размер товара" }).getByRole("button", { name: "M", exact: true }).click();
    await cartPage.getByRole("button", { name: "Добавить в корзину" }).click();
    const drawer = cartPage.getByRole("dialog", { name: "Корзина" });
    await drawer.waitFor({ state: "visible" });
    await cartPage.waitForTimeout(280);
    if (!(await drawer.getByRole("link", { name: "Посмотреть оформление" }).isVisible())) failures.push(`Cart checkout action is hidden at ${width}px`);
    if (await drawer.evaluate((element) => element.scrollWidth > element.clientWidth)) failures.push(`Cart overflows horizontally at ${width}px`);
    if (screenshotDir) await cartPage.screenshot({ path: join(screenshotDir, `cart-filled-${width}.png`) });
    await cartContext.close();
  }

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
