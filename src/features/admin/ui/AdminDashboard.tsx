"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { getStorageImageUrl } from "@/features/catalog/api/storage-image-url";
import { formatPrice } from "@/features/catalog/model/mock-products";

import styles from "./AdminDashboard.module.scss";

const variantSchema = z.object({
  id: z.uuid(), sku: z.string(), color: z.string(), size: z.string(), stock: z.number(),
  priceMinor: z.number().nullable(), isActive: z.boolean(),
});
const imageSchema = z.object({
  id: z.uuid(), color: z.string().nullable(), localPath: z.string().nullable(),
  storageKey: z.string().nullable(), altText: z.string(), sortOrder: z.number(),
});
const productSchema = z.object({
  id: z.uuid(), slug: z.string(), name: z.string(), description: z.string(), category: z.string(),
  composition: z.string().nullable(), careInstructions: z.string().nullable(),
  priceMinor: z.number(), status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  variants: z.array(variantSchema), images: z.array(imageSchema),
});
const productsSchema = z.object({ items: z.array(productSchema), total: z.number(), page: z.number() });
const orderSchema = z.object({
  id: z.uuid(), number: z.number(), status: z.enum(["PENDING_PAYMENT", "PAID", "PROCESSING", "COMPLETED", "CANCELLED", "REFUNDED"]),
  totalMinor: z.number(), createdAt: z.string(), contactName: z.string(), contactEmail: z.string(), contactPhone: z.string(),
  items: z.array(z.object({ productName: z.string(), color: z.string(), size: z.string(), quantity: z.number() })),
  payments: z.array(z.object({ status: z.string() })),
});
const ordersSchema = z.object({ items: z.array(orderSchema), total: z.number(), page: z.number() });

type AdminProduct = z.infer<typeof productSchema>;
type AdminVariant = z.infer<typeof variantSchema>;
type AdminImage = z.infer<typeof imageSchema>;
type AdminOrder = z.infer<typeof orderSchema>;

const newProductSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().trim().min(2),
  description: z.string().trim().min(10),
  category: z.enum(["T-shirts", "Hoodies", "Shirts", "Trousers", "Outerwear", "Accessories"]),
  price: z.string().regex(/^\d+(?:\.\d{1,2})?$/),
  sku: z.string().trim().min(2),
  color: z.string().trim().min(1),
  size: z.string().trim().min(1),
  stock: z.string().regex(/^\d+$/),
});
type NewProductFields = z.infer<typeof newProductSchema>;

const orderLabels: Record<AdminOrder["status"], string> = {
  PENDING_PAYMENT: "Ожидает оплаты", PAID: "Оплачен", PROCESSING: "В работе",
  COMPLETED: "Завершён", CANCELLED: "Отменён", REFUNDED: "Возврат",
};
const productStatusLabels: Record<AdminProduct["status"], string> = {
  DRAFT: "Черновик", PUBLISHED: "Опубликован", ARCHIVED: "Архив",
};

function toMinorUnits(value: string): number {
  const [dollars, cents = ""] = value.split(".");
  return Number(dollars) * 100 + Number(cents.padEnd(2, "0"));
}

async function adminFetch(path: string, method = "GET", body?: unknown): Promise<unknown> {
  const response = await fetch(path, {
    method, credentials: "same-origin", cache: "no-store",
    ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  });
  const data = await response.json() as unknown;
  if (!response.ok) {
    const error = z.object({ message: z.string() }).safeParse(data);
    throw new Error(error.success ? error.data.message : "Не удалось выполнить действие.");
  }
  return data;
}

function useAdminAction(onMessage: (message: string) => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ path, method, body }: { path: string; method: string; body?: unknown }) => adminFetch(path, method, body),
    onSuccess: async (_result, variables) => {
      onMessage(variables.method === "DELETE" && variables.path.startsWith("/api/admin/products/")
        ? "Черновик удалён. Фотографии поставлены в очередь очистки." : "Изменения сохранены.");
      await Promise.all([client.invalidateQueries({ queryKey: ["admin-products"] }), client.invalidateQueries({ queryKey: ["admin-orders"] })]);
    },
    onError: (error: Error) => onMessage(error.message),
  });
}

export function AdminDashboard() {
  const [tab, setTab] = useState<"products" | "orders">("products");
  const [productPage, setProductPage] = useState(1);
  const [orderPage, setOrderPage] = useState(1);
  const [message, setMessage] = useState("");
  const products = useQuery({
    queryKey: ["admin-products", productPage],
    queryFn: async () => productsSchema.parse(await adminFetch(`/api/admin/products?page=${productPage}`)),
    enabled: tab === "products",
  });
  const orders = useQuery({
    queryKey: ["admin-orders", orderPage],
    queryFn: async () => ordersSchema.parse(await adminFetch(`/api/admin/orders?page=${orderPage}`)),
    enabled: tab === "orders",
  });
  const action = useAdminAction(setMessage);

  return (
    <section aria-labelledby="admin-title" className={styles.page}>
      <div className={styles.topline}><strong>AQVERINE / CONTROL</strong><span>ДОСТУП АДМИНИСТРАТОРА</span></div>
      <div className={styles.hero}>
        <div><span className={styles.eyebrow}>УПРАВЛЕНИЕ МАГАЗИНОМ</span><h1 id="admin-title">ВСЁ<br /><em>ПОД КОНТРОЛЕМ.</em></h1></div>
        <p>Товары, варианты, фотографии и заказы. Оплату подтверждает только платёжный провайдер.</p>
      </div>
      <div aria-label="Разделы панели" className={styles.tabs} role="tablist">
        <button aria-selected={tab === "products"} onClick={() => setTab("products")} role="tab" type="button">Товары <span>{products.data?.total ?? ""}</span></button>
        <button aria-selected={tab === "orders"} onClick={() => setTab("orders")} role="tab" type="button">Заказы <span>{orders.data?.total ?? ""}</span></button>
      </div>
      {message ? <p className={styles.notice} role="status">{message}</p> : null}

      {tab === "products" ? (
        <div aria-label="Товары" role="tabpanel">
          <NewProductForm onCreated={() => { setMessage("Черновик товара создан."); setProductPage(1); }} />
          {products.isPending ? <p className={styles.state} role="status">Загружаем товары…</p> :
            products.isError ? <p className={styles.state} role="alert">Не удалось загрузить товары. <button onClick={() => void products.refetch()} type="button">Повторить</button></p> :
              products.data.items.length === 0 ? <p className={styles.state}>Товаров пока нет. Создай первый черновик выше.</p> :
                <div className={styles.productList}>{products.data.items.map((product) => (
                  <ProductEditor action={action} key={product.id} product={product} />
                ))}</div>}
          {products.data && products.data.total > 25 ? <Pagination onChange={setProductPage} page={productPage} total={products.data.total} /> : null}
        </div>
      ) : (
        <div aria-label="Заказы" role="tabpanel">
          {orders.isPending ? <p className={styles.state} role="status">Загружаем заказы…</p> :
            orders.isError ? <p className={styles.state} role="alert">Не удалось загрузить заказы. <button onClick={() => void orders.refetch()} type="button">Повторить</button></p> :
              orders.data.items.length === 0 ? <p className={styles.state}>Заказов пока нет.</p> :
                <div className={styles.orderList}>{orders.data.items.map((order) => <OrderCard action={action} key={order.id} order={order} />)}</div>}
          {orders.data && orders.data.total > 25 ? <Pagination onChange={setOrderPage} page={orderPage} total={orders.data.total} /> : null}
        </div>
      )}
    </section>
  );
}

function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (page: number) => void }) {
  return <div className={styles.pagination}>
    <button disabled={page <= 1} onClick={() => onChange(page - 1)} type="button">← Назад</button>
    <span>Страница {page} из {Math.ceil(total / 25)}</span>
    <button disabled={page * 25 >= total} onClick={() => onChange(page + 1)} type="button">Дальше →</button>
  </div>;
}

function NewProductForm({ onCreated }: { onCreated: () => void }) {
  const client = useQueryClient();
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const form = useForm<NewProductFields>({
    resolver: zodResolver(newProductSchema),
    defaultValues: { category: "T-shirts", price: "29.00", stock: "0", size: "M" },
  });
  const submit = form.handleSubmit(async (values) => {
    setError("");
    try {
      await adminFetch("/api/admin/products", "POST", {
        slug: values.slug, name: values.name, description: values.description,
        category: values.category, priceMinor: toMinorUnits(values.price),
        variants: [{ sku: values.sku, color: values.color, size: values.size, stock: Number(values.stock) }],
      });
      form.reset();
      setOpen(false);
      await client.invalidateQueries({ queryKey: ["admin-products"] });
      onCreated();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось создать товар.");
    }
  });
  return <div className={styles.createPanel}>
    <div><span className={styles.eyebrow}>КАТАЛОГ</span><h2>Создать товар</h2><p>Новый товар начнёт как черновик. Для публикации добавь фотографию.</p></div>
    <button aria-expanded={open} className={styles.primaryButton} onClick={() => setOpen(!open)} type="button">{open ? "Закрыть форму" : "Новый товар ↗"}</button>
    {open ? <form className={styles.formGrid} noValidate onSubmit={(event) => { void submit(event); }}>
      <label>Название<input aria-invalid={Boolean(form.formState.errors.name)} {...form.register("name")} /></label>
      <label>Slug<input aria-invalid={Boolean(form.formState.errors.slug)} placeholder="city-shirt" {...form.register("slug")} /></label>
      <label>Категория<select {...form.register("category")}><option value="T-shirts">Футболки</option><option value="Hoodies">Худи</option><option value="Shirts">Рубашки</option><option value="Trousers">Брюки</option><option value="Outerwear">Верхняя одежда</option><option value="Accessories">Аксессуары</option></select></label>
      <label>Цена, $<input inputMode="decimal" {...form.register("price")} /></label>
      <label className={styles.wide}>Описание<textarea rows={3} {...form.register("description")} /></label>
      <label>SKU первого варианта<input {...form.register("sku")} /></label>
      <label>Цвет<input {...form.register("color")} /></label>
      <label>Размер<input {...form.register("size")} /></label>
      <label>Остаток<input inputMode="numeric" {...form.register("stock")} /></label>
      {Object.values(form.formState.errors).length ? <p className={styles.wide} role="alert">Проверь название, slug, описание, цену и первый вариант.</p> : null}
      {error ? <p className={styles.wide} role="alert">{error}</p> : null}
      <button className={styles.primaryButton} disabled={form.formState.isSubmitting} type="submit">Создать черновик ↗</button>
    </form> : null}
  </div>;
}

function ProductEditor({ product, action }: { product: AdminProduct; action: ReturnType<typeof useAdminAction> }) {
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description);
  const [category, setCategory] = useState(product.category);
  const [composition, setComposition] = useState(product.composition ?? "");
  const [careInstructions, setCareInstructions] = useState(product.careInstructions ?? "");
  const [price, setPrice] = useState((product.priceMinor / 100).toFixed(2));
  const [sku, setSku] = useState("");
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [stock, setStock] = useState("0");
  const [variantPrice, setVariantPrice] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [altText, setAltText] = useState(product.name);
  const [photoColor, setPhotoColor] = useState("");
  const client = useQueryClient();
  const saveProduct = () => action.mutate({ path: `/api/admin/products/${product.id}`, method: "PATCH", body: {
    name, description, category, composition: composition || null, careInstructions: careInstructions || null,
    priceMinor: toMinorUnits(price),
  } });
  const addVariant = () => {
    action.mutate({ path: `/api/admin/products/${product.id}/variants`, method: "POST", body: {
      sku, color, size, stock: Number(stock), priceMinor: variantPrice ? toMinorUnits(variantPrice) : null,
    } });
    setSku(""); setColor(""); setSize(""); setStock("0"); setVariantPrice("");
  };
  const uploadPhoto = async (file: File | undefined) => {
    if (!file) return;
    setPhotoError("");
    const form = new FormData();
    form.set("file", file);
    form.set("altText", altText);
    form.set("color", photoColor);
    form.set("sortOrder", String(product.images.length));
    try {
      const response = await fetch(`/api/admin/products/${product.id}/images`, { method: "POST", credentials: "same-origin", body: form });
      if (!response.ok) {
        const raw = await response.json() as unknown;
        const parsed = z.object({ message: z.string() }).safeParse(raw);
        throw new Error(parsed.success ? parsed.data.message : "Не удалось загрузить фотографию.");
      }
      await client.invalidateQueries({ queryKey: ["admin-products"] });
    } catch (caught) {
      setPhotoError(caught instanceof Error ? caught.message : "Не удалось загрузить фотографию.");
    }
  };
  return <article className={styles.productCard}>
    <div className={styles.productSummary}>
      <div className={styles.productThumb}>
        {product.images[0] ? <Image alt="" fill sizes="80px" src={product.images[0].localPath ?? getStorageImageUrl(product.images[0].storageKey) ?? "/images/products/essential-t-shirt.png"} /> : <span>NO PHOTO</span>}
      </div>
      <div><span className={styles.eyebrow}>{product.category} / {productStatusLabels[product.status]}</span><h3>{product.name}</h3><span>{formatPrice(product.priceMinor)} · {product.variants.length} вариантов</span></div>
      <button aria-expanded={expanded} onClick={() => setExpanded(!expanded)} type="button">{expanded ? "Свернуть ↑" : "Управлять ↗"}</button>
    </div>
    {expanded ? <div className={styles.details}>
      <div className={styles.formGrid}>
        <label>Название<input onChange={(event) => setName(event.target.value)} value={name} /></label>
        <label>Цена, $<input inputMode="decimal" onChange={(event) => setPrice(event.target.value)} value={price} /></label>
        <label>Категория<select onChange={(event) => setCategory(event.target.value)} value={category}><option value="T-shirts">Футболки</option><option value="Hoodies">Худи</option><option value="Shirts">Рубашки</option><option value="Trousers">Брюки</option><option value="Outerwear">Верхняя одежда</option><option value="Accessories">Аксессуары</option></select></label>
        <label>Состав<input onChange={(event) => setComposition(event.target.value)} value={composition} /></label>
        <label className={styles.wide}>Описание<textarea onChange={(event) => setDescription(event.target.value)} rows={3} value={description} /></label>
        <label className={styles.wide}>Уход<input onChange={(event) => setCareInstructions(event.target.value)} value={careInstructions} /></label>
        <button disabled={action.isPending} onClick={saveProduct} type="button">Сохранить товар</button>
        {product.status === "PUBLISHED" ? <button disabled={action.isPending} onClick={() => action.mutate({ path: `/api/admin/products/${product.id}`, method: "PATCH", body: { status: "DRAFT" } })} type="button">Скрыть с витрины</button> :
          product.status === "ARCHIVED" ? <button disabled={action.isPending} onClick={() => action.mutate({ path: `/api/admin/products/${product.id}`, method: "PATCH", body: { status: "DRAFT" } })} type="button">Вернуть из архива</button> :
            <button disabled={action.isPending} onClick={() => action.mutate({ path: `/api/admin/products/${product.id}`, method: "PATCH", body: { status: "PUBLISHED" } })} type="button">Опубликовать</button>}
        {product.status !== "ARCHIVED" ? <button disabled={action.isPending} onClick={() => {
          if (window.confirm("Архивировать товар? Он исчезнет из каталога, старые заказы сохранятся.")) {
            action.mutate({ path: `/api/admin/products/${product.id}`, method: "PATCH", body: { status: "ARCHIVED" } });
          }
        }} type="button">Архивировать</button> : null}
        {product.status === "DRAFT" ? <button className={styles.dangerButton} disabled={action.isPending} onClick={() => {
          if (window.confirm(`Удалить черновик «${product.name}» навсегда? Если товар уже добавлен в корзину или заказ, удаление будет отклонено.`)) {
            action.mutate({ path: `/api/admin/products/${product.id}`, method: "DELETE" });
          }
        }} type="button">Удалить черновик</button> : null}
      </div>
      <div className={styles.subsection}><h4>Варианты и остатки</h4>
        <div className={styles.variantList}>{product.variants.map((variant) => <VariantEditor action={action} key={variant.id} variant={variant} />)}</div>
        <div className={styles.inlineForm}>
          <input aria-label="SKU нового варианта" onChange={(event) => setSku(event.target.value)} placeholder="SKU" value={sku} />
          <input aria-label="Цвет нового варианта" onChange={(event) => setColor(event.target.value)} placeholder="Цвет" value={color} />
          <input aria-label="Размер нового варианта" onChange={(event) => setSize(event.target.value)} placeholder="Размер" value={size} />
          <input aria-label="Остаток нового варианта" inputMode="numeric" onChange={(event) => setStock(event.target.value)} value={stock} />
          <input aria-label="Цена нового варианта в долларах" inputMode="decimal" onChange={(event) => setVariantPrice(event.target.value)} placeholder="Цена $, если отличается" value={variantPrice} />
          <button disabled={action.isPending || !sku || !color || !size} onClick={addVariant} type="button">Добавить вариант</button>
        </div>
      </div>
      <div className={styles.subsection}><h4>Фотографии</h4>
        <div className={styles.imageList}>{product.images.map((image) => <ImageEditor action={action} image={image} key={image.id} />)}</div>
        <div className={styles.inlineForm}>
          <label>Фото JPEG, PNG или WebP<input accept="image/jpeg,image/png,image/webp" onChange={(event) => { void uploadPhoto(event.target.files?.[0]); event.target.value = ""; }} type="file" /></label>
          <input aria-label="Описание фото" onChange={(event) => setAltText(event.target.value)} placeholder="Описание фото" value={altText} />
          <input aria-label="Цвет на фото" onChange={(event) => setPhotoColor(event.target.value)} placeholder="Цвет (необязательно)" value={photoColor} />
        </div>
        {photoError ? <p role="alert">{photoError}</p> : null}
      </div>
      <Link href={`/products/${product.slug}`}>Открыть карточку товара ↗</Link>
    </div> : null}
  </article>;
}

function VariantEditor({ variant, action }: { variant: AdminVariant; action: ReturnType<typeof useAdminAction> }) {
  const [stock, setStock] = useState(String(variant.stock));
  const [price, setPrice] = useState(variant.priceMinor === null ? "" : (variant.priceMinor / 100).toFixed(2));
  return <div className={styles.variant}>
    <div><strong>{variant.color} / {variant.size}</strong><small>{variant.sku}</small></div>
    <label>Остаток<input aria-label={`Остаток ${variant.sku}`} inputMode="numeric" onChange={(event) => setStock(event.target.value)} value={stock} /></label>
    <label>Цена, $<input aria-label={`Цена ${variant.sku}`} inputMode="decimal" onChange={(event) => setPrice(event.target.value)} placeholder="Базовая" value={price} /></label>
    <button disabled={action.isPending || !/^\d+$/.test(stock) || Boolean(price && !/^\d+(?:\.\d{1,2})?$/.test(price))} onClick={() => action.mutate({ path: `/api/admin/variants/${variant.id}`, method: "PATCH", body: { stock: Number(stock), priceMinor: price ? toMinorUnits(price) : null } })} type="button">Сохранить</button>
    <button disabled={action.isPending} onClick={() => action.mutate({ path: `/api/admin/variants/${variant.id}`, method: "PATCH", body: { isActive: !variant.isActive } })} type="button">{variant.isActive ? "Скрыть" : "Включить"}</button>
  </div>;
}

function ImageEditor({ image, action }: { image: AdminImage; action: ReturnType<typeof useAdminAction> }) {
  const [order, setOrder] = useState(String(image.sortOrder));
  const src = image.localPath ?? getStorageImageUrl(image.storageKey);
  return <div className={styles.imageRow}>
    <div className={styles.productThumb}>{src ? <Image alt={image.altText} fill sizes="80px" src={src} /> : <span>NO PHOTO</span>}</div>
    <span>{image.color ?? "Все цвета"}<small>{image.altText}</small></span>
    <label>Порядок<input aria-label={`Порядок фото ${image.altText}`} inputMode="numeric" onChange={(event) => setOrder(event.target.value)} value={order} /></label>
    <button disabled={action.isPending || !/^\d+$/.test(order)} onClick={() => action.mutate({ path: `/api/admin/images/${image.id}`, method: "PATCH", body: { sortOrder: Number(order) } })} type="button">Сохранить</button>
    <button disabled={action.isPending} onClick={() => {
      if (window.confirm("Удалить фотографию товара?")) action.mutate({ path: `/api/admin/images/${image.id}`, method: "DELETE" });
    }} type="button">Удалить</button>
  </div>;
}

function OrderCard({ order, action }: { order: AdminOrder; action: ReturnType<typeof useAdminAction> }) {
  return <article className={styles.orderCard}>
    <div className={styles.orderTop}><div><span className={styles.eyebrow}>ЗАКАЗ #{order.number} · {new Date(order.createdAt).toLocaleDateString("ru-RU")}</span><h3>{orderLabels[order.status]}</h3></div><strong>{formatPrice(order.totalMinor)}</strong></div>
    <div className={styles.orderInfo}><span>Оплата: {order.payments[0]?.status ?? "—"}</span><span>{order.contactName}</span><span>{order.contactEmail}</span><span>{order.contactPhone}</span></div>
    <ul>{order.items.map((item, index) => <li key={`${item.productName}-${index}`}>{item.productName} · {item.color} / {item.size} × {item.quantity}</li>)}</ul>
    {order.status === "PAID" || order.status === "PROCESSING" ? <button className={styles.primaryButton} disabled={action.isPending} onClick={() => action.mutate({ path: `/api/admin/orders/${order.id}`, method: "PATCH", body: { status: order.status === "PAID" ? "PROCESSING" : "COMPLETED" } })} type="button">{order.status === "PAID" ? "Взять в работу ↗" : "Завершить заказ ↗"}</button> : null}
  </article>;
}
