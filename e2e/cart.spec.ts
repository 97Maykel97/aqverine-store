import { expect, test, type Locator, type Page } from "@playwright/test";

const cart = (page: Page) => page.getByRole("dialog", { name: "Корзина" });

const cartLine = (page: Page, name: string): Locator =>
  cart(page).locator("article").filter({ hasText: name });

async function addProduct(page: Page, slug: string, color: string, size = "M") {
  await page.goto(`/products/${slug}`);
  await page.waitForLoadState("networkidle");
  const colorButton = page.getByRole("group", { name: "Цвет товара" }).getByRole("button", { name: color });
  await colorButton.click();
  await expect(colorButton).toHaveAttribute("aria-pressed", "true");
  const sizeButton = page.getByRole("group", { name: "Размер товара" }).getByRole("button", { name: size });
  await sizeButton.click();
  await expect(sizeButton).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Добавить в корзину" }).click();
  await expect(cart(page)).toBeVisible();
}

async function expectTotal(page: Page, amount: string) {
  await expect(cart(page).getByText("Итого", { exact: true }).locator("..")).toContainText(amount);
}

test("selected product variant reaches the cart and quantity changes update the total", async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/products/essential-t-shirt");
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveTitle(/AQVERINE/);
  await expect(page.getByRole("button", { name: "Выберите размер" })).toBeDisabled();

  const blueButton = page.getByRole("group", { name: "Цвет товара" }).getByRole("button", { name: "Синий" });
  await blueButton.click();
  await expect(blueButton).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("img", { name: "Футболка Essential, цвет синий" })).toBeVisible();
  const mediumButton = page.getByRole("group", { name: "Размер товара" }).getByRole("button", { name: "M" });
  await mediumButton.click();
  await expect(mediumButton).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Добавить в корзину" }).click();

  await expect(cart(page)).toBeVisible();
  const shirt = cartLine(page, "Футболка Essential");
  await expect(shirt).toContainText("Синий / M");
  await expect(shirt.locator('[aria-label="Количество: 1"]')).toBeVisible();
  await expectTotal(page, "$29");

  await shirt.getByRole("button", { name: "Увеличить количество Футболка Essential" }).click();
  await expect(shirt.locator('[aria-label="Количество: 2"]')).toBeVisible();
  await expectTotal(page, "$58");

  await shirt.getByRole("button", { name: "Уменьшить количество Футболка Essential" }).click();
  await expect(shirt.locator('[aria-label="Количество: 1"]')).toBeVisible();
  await expectTotal(page, "$29");

  await page.screenshot({ path: testInfo.outputPath("cart-product-quantity.png") });
  await cart(page).getByRole("button", { name: "Закрыть корзину" }).click();
  await expect(cart(page)).toBeHidden();
  await page.reload();
  await page.getByRole("button", { name: "Открыть корзину, товаров: 1" }).click();
  await expect(cartLine(page, "Футболка Essential")).toContainText("Синий / M");
  await expectTotal(page, "$29");
  expect(pageErrors).toEqual([]);
});

test("multiple products recalculate after removal and leave an empty cart", async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await addProduct(page, "essential-t-shirt", "Белый");
  await expectTotal(page, "$29");
  await cart(page).getByRole("button", { name: "Закрыть корзину" }).click();
  await expect(cart(page)).toBeHidden();

  await addProduct(page, "everyday-hoodie", "Чёрный");
  await expect(cartLine(page, "Футболка Essential")).toBeVisible();
  const hoodie = cartLine(page, "Худи Everyday");
  await expect(hoodie).toContainText("Чёрный / M");
  await expectTotal(page, "$98");

  await cartLine(page, "Футболка Essential").getByRole("button", { name: "Удалить Футболка Essential" }).click();
  await expect(cartLine(page, "Футболка Essential")).toHaveCount(0);
  await expectTotal(page, "$69");

  await hoodie.getByRole("button", { name: "Увеличить количество Худи Everyday" }).click();
  await expect(hoodie.locator('[aria-label="Количество: 2"]')).toBeVisible();
  await expectTotal(page, "$138");
  await page.screenshot({ path: testInfo.outputPath("cart-two-units.png") });

  await hoodie.getByRole("button", { name: "Удалить Худи Everyday" }).click();
  await expect(cart(page)).toContainText("Пока пусто.");
  await expect(cart(page).locator("article")).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("cart-empty.png") });
  expect(pageErrors).toEqual([]);
});
