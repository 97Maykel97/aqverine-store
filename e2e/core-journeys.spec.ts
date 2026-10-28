import { expect, test, type Page } from "@playwright/test";

function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test("search finds a product after an empty result", async ({ page }, testInfo) => {
  const pageErrors = collectPageErrors(page);

  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveTitle(/AQVERINE/);
  await page.getByRole("button", { name: "Поиск товаров" }).click();

  const search = page.getByRole("dialog", { name: "Поиск товаров" });
  await expect(search).toBeVisible();
  const query = search.getByRole("combobox", { name: "Поиск товаров" });
  await query.fill("несуществующий товар");
  await expect(search.getByRole("status")).toContainText("Пока ничего не нашли");

  await query.fill("худи");
  await search.getByRole("option", { name: /Худи Everyday/ }).click();
  await expect(page).toHaveURL(/\/products\/everyday-hoodie$/);
  await expect(page.getByRole("heading", { level: 1, name: "Худи Everyday" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("search-product.png") });
  expect(pageErrors).toEqual([]);
});

test("checkout blocks an empty cart and validates a demo without creating an order", async ({ page }, testInfo) => {
  const pageErrors = collectPageErrors(page);

  await page.goto("/checkout");
  await expect(page).toHaveTitle(/Оформление.*AQVERINE/);
  await expect(page.getByRole("link", { name: /Перейти в каталог/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Продолжить в демо" })).toHaveCount(0);

  await page.goto("/products/essential-t-shirt");
  await page.waitForLoadState("networkidle");
  const medium = page.getByRole("group", { name: "Размер товара" }).getByRole("button", { name: "M" });
  await medium.click();
  await expect(medium).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Добавить в корзину" }).click();

  const cart = page.getByRole("dialog", { name: "Корзина" });
  await expect(cart).toBeVisible();
  await cart.getByRole("link", { name: "Посмотреть оформление" }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(cart).toBeHidden();

  const summary = page.getByRole("complementary", { name: "Состав корзины" });
  await expect(summary).toContainText("Футболка Essential");
  await expect(summary).toContainText("Белый / M · 1 шт.");
  await expect(summary.getByText("Итого", { exact: true }).locator("..")).toContainText("$29");
  await expect(page.getByText("ОПЛАТА НЕДОСТУПНА В ДЕМО")).toBeVisible();

  await page.getByRole("button", { name: "Продолжить в демо" }).click();
  await expect(page.getByRole("main").locator("form").getByRole("alert")).toHaveCount(4);
  await page.getByRole("textbox", { name: "Имя *" }).fill("Demo Buyer");
  await page.getByRole("textbox", { name: "Телефон *" }).fill("+1 555 123 4567");
  await page.getByRole("textbox", { name: "Электронная почта *" }).fill("demo@example.com");
  await page.getByRole("checkbox", { name: /Я понимаю, что это демонстрация/ }).check();
  await page.getByRole("button", { name: "Продолжить в демо" }).click();

  await expect(page.getByRole("status").filter({ hasText: "Данные прошли проверку" })).toContainText("Заказ не создан, оплата не началась");
  await expect(page).toHaveURL(/\/checkout$/);
  await page.screenshot({ path: testInfo.outputPath("checkout-demo-validation.png") });
  expect(pageErrors).toEqual([]);
});

test("admin entry remains closed without server-side authentication", async ({ page }, testInfo) => {
  const pageErrors = collectPageErrors(page);

  await page.goto("/aqverine-control");
  await expect(page).toHaveURL(/\/aqverine-control\/login$/);
  await expect(page).toHaveTitle(/Панель управления.*AQVERINE/);
  await expect(page.getByRole("heading", { name: /ЗАКРЫТО/ })).toBeVisible();
  await expect(page.getByText("Доступ пока не настроен")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("admin-closed.png") });
  expect(pageErrors).toEqual([]);
});
