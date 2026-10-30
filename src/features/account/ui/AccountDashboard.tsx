"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { keepPreviousData, QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { fetchAccountOrder, fetchAccountOrders, fetchAccountProfile, saveAccountProfile } from "@/features/account/api/account-client";
import type { AccountOrders, AccountProfile } from "@/features/account/model/account-contracts";
import { profileFormSchema, type ProfileFormFields } from "@/features/account/model/profile-form";
import { LogoutButton } from "@/features/auth/ui/LogoutButton";
import { formatUsdMinor } from "@/shared/lib/format-money";
import { pluralizeRu } from "@/shared/lib/pluralize-ru";

import styles from "./AccountDashboard.module.scss";

const orderLabels: Record<AccountOrders["items"][number]["status"], string> = {
  PENDING_PAYMENT: "Ожидает оплаты",
  PAID: "Оплачен",
  PROCESSING: "Готовится",
  COMPLETED: "Завершён",
  CANCELLED: "Отменён",
  REFUNDED: "Возврат оформлен",
};
const paymentLabels: Record<NonNullable<AccountOrders["items"][number]["paymentStatus"]>, string> = {
  PENDING: "ожидает оплаты",
  PAID: "оплачено",
  FAILED: "ошибка оплаты",
  CANCELLED: "отменено",
  REFUNDED: "возврат",
};

function sessionExpired(error: unknown): boolean {
  return error instanceof Error && error.message === "SESSION_EXPIRED";
}

type AccountDashboardProps = { initialProfile: AccountProfile; initialOrders: AccountOrders };

export function AccountDashboard(props: AccountDashboardProps) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
  }));
  return <QueryClientProvider client={queryClient}><AccountDashboardContent {...props} /></QueryClientProvider>;
}

function AccountDashboardContent({ initialProfile, initialOrders }: AccountDashboardProps) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<"saved" | "error" | null>(null);

  const profileQuery = useQuery({
    queryKey: ["account", "profile"],
    queryFn: fetchAccountProfile,
    initialData: initialProfile,
    staleTime: 30_000,
  });
  const ordersQuery = useQuery({
    queryKey: ["account", "orders", page],
    queryFn: () => fetchAccountOrders(page),
    initialData: page === 1 ? initialOrders : undefined,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
  const detailQuery = useQuery({
    queryKey: ["account", "order", selectedOrderId],
    queryFn: () => {
      if (!selectedOrderId) throw new Error("ORDER_NOT_SELECTED");
      return fetchAccountOrder(selectedOrderId);
    },
    enabled: selectedOrderId !== null,
  });

  const form = useForm<ProfileFormFields>({
    resolver: zodResolver(profileFormSchema),
    mode: "onBlur",
    defaultValues: { fullName: initialProfile.fullName ?? "", phone: initialProfile.phone ?? "" },
    values: { fullName: profileQuery.data.fullName ?? "", phone: profileQuery.data.phone ?? "" },
    resetOptions: { keepDirtyValues: true },
  });
  const saveProfile = useMutation({
    mutationFn: saveAccountProfile,
    onSuccess: (profile) => {
      queryClient.setQueryData(["account", "profile"], profile);
      form.reset({ fullName: profile.fullName ?? "", phone: profile.phone ?? "" });
      setFeedback("saved");
    },
    onError: () => setFeedback("error"),
  });

  const submit = async (values: ProfileFormFields) => {
    setFeedback(null);
    try {
      await saveProfile.mutateAsync(values);
    } catch {
      // The mutation renders its own safe error state.
    }
  };

  const orders = ordersQuery.data;
  const showingPreviousPage = ordersQuery.isPlaceholderData;

  return (
    <section className={styles.page} aria-labelledby="account-title">
      <div className={styles.topline}><span>ACCOUNT / AQVERINE</span><span>ТВОЙ ГОРОД. ТВОИ ПРАВИЛА.</span></div>
      <div className={styles.heading}>
        <div>
          <h1 id="account-title">ЛИЧНЫЙ<br /><em>КАБИНЕТ.</em></h1>
          <p>{profileQuery.data.fullName ? `Привет, ${profileQuery.data.fullName}.` : "Всё важное о твоём аккаунте — здесь."}</p>
        </div>
        <div className={styles.accountActions}>
          <span className={styles.email}>{initialProfile.email}</span>
          <Link href="/catalog">Вернуться к вещам <span aria-hidden="true">↗</span></Link>
          <Link href="/account/update-password">Изменить пароль</Link>
          <LogoutButton />
        </div>
      </div>

      <div className={styles.sections}>
        <section className={styles.profile} aria-labelledby="profile-heading">
          <div className={styles.sectionHeading}><h2 id="profile-heading">Личные данные</h2><p>Контакты для оформления заказа</p></div>
          {profileQuery.isError ? (
            <div className={styles.notice} role="alert">{sessionExpired(profileQuery.error) ? "Сессия завершилась." : "Не удалось обновить данные."} {sessionExpired(profileQuery.error) ? <Link href="/login">Войти снова</Link> : <button onClick={() => void profileQuery.refetch()} type="button">Повторить</button>}</div>
          ) : null}
          <form noValidate onSubmit={form.handleSubmit(submit)}>
            <label htmlFor="account-full-name">Имя</label>
            <input aria-invalid={Boolean(form.formState.errors.fullName)} autoComplete="name" id="account-full-name" placeholder="Как к тебе обращаться" {...form.register("fullName")} />
            {form.formState.errors.fullName ? <small role="alert">{form.formState.errors.fullName.message}</small> : null}

            <label htmlFor="account-phone">Телефон</label>
            <input aria-invalid={Boolean(form.formState.errors.phone)} autoComplete="tel" id="account-phone" placeholder="+1 555 123 4567" type="tel" {...form.register("phone")} />
            {form.formState.errors.phone ? <small role="alert">{form.formState.errors.phone.message}</small> : null}

            <label htmlFor="account-email">Почта</label>
            <input autoComplete="email" id="account-email" readOnly type="email" value={profileQuery.data.email} />
            <p className={styles.fieldHint}>Адрес почты привязан к входу в аккаунт.</p>

            <button className={styles.saveButton} disabled={saveProfile.isPending || !form.formState.isDirty} type="submit">
              {saveProfile.isPending ? "Сохраняем…" : "Сохранить данные"} <span aria-hidden="true">↗</span>
            </button>
            {feedback === "saved" ? <p className={styles.success} role="status">Данные сохранены.</p> : null}
            {feedback === "error" ? <p className={styles.error} role="alert">{sessionExpired(saveProfile.error) ? <>Сессия завершилась. <Link href="/login">Войти снова</Link></> : "Не удалось сохранить данные. Попробуйте ещё раз."}</p> : null}
          </form>
        </section>

        <section className={styles.orders} aria-labelledby="orders-heading">
          <div className={styles.sectionHeading}>
            <h2 id="orders-heading">Твои заказы</h2>
            <p>{orders && orders.total > 0 ? `${orders.total} ${pluralizeRu(orders.total, { one: "заказ", few: "заказа", many: "заказов" })}` : "История покупок"}</p>
          </div>
          {ordersQuery.isPending ? <p className={styles.notice} role="status">Загружаем заказы…</p> : null}
          {ordersQuery.isError ? (
            <div className={styles.notice} role="alert">{sessionExpired(ordersQuery.error) ? "Сессия завершилась." : "Не удалось загрузить заказы."} {sessionExpired(ordersQuery.error) ? <Link href="/login">Войти снова</Link> : <button onClick={() => void ordersQuery.refetch()} type="button">Повторить</button>}</div>
          ) : null}
          {orders && !ordersQuery.isError && orders.items.length === 0 ? (
            <div className={styles.empty}>
              <strong>Пока нет заказов.</strong>
              <p>Когда покупка будет оформлена, здесь появятся её состав и статус.</p>
              <Link href="/catalog">Открыть каталог <span aria-hidden="true">↗</span></Link>
            </div>
          ) : null}
          {orders && !ordersQuery.isError && orders.items.length > 0 ? (
            <>
              {showingPreviousPage ? <p className={styles.loading} role="status">Загружаем следующую страницу…</p> : null}
              <div className={styles.orderList} aria-busy={showingPreviousPage}>
                {orders.items.map((order) => (
                  <article className={styles.order} key={order.id}>
                    <div className={styles.orderTop}>
                      <div><span className={styles.orderNumber}>Заказ №{order.number}</span><time dateTime={order.createdAt}>{new Date(order.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}</time></div>
                      <strong>{formatUsdMinor(order.totalMinor)}</strong>
                    </div>
                    <div className={styles.orderMeta}><span>{orderLabels[order.status]}</span><span>Оплата: {order.paymentStatus ? paymentLabels[order.paymentStatus] : "не создана"}</span><span>{order.items.length} {pluralizeRu(order.items.length, { one: "позиция", few: "позиции", many: "позиций" })}</span></div>
                    <button aria-expanded={selectedOrderId === order.id} className={styles.detailButton} disabled={showingPreviousPage} onClick={() => setSelectedOrderId(selectedOrderId === order.id ? null : order.id)} type="button">
                      {selectedOrderId === order.id ? "Скрыть детали" : "Посмотреть детали"} <span aria-hidden="true">↗</span>
                    </button>
                    {selectedOrderId === order.id ? (
                      <div className={styles.orderDetail}>
                        {detailQuery.isPending ? <p role="status">Загружаем состав заказа…</p> : null}
                        {detailQuery.isError ? <p role="alert">{sessionExpired(detailQuery.error) ? "Сессия завершилась." : "Не удалось открыть заказ."} {sessionExpired(detailQuery.error) ? <Link href="/login">Войти снова</Link> : <button onClick={() => void detailQuery.refetch()} type="button">Повторить</button>}</p> : null}
                        {detailQuery.data ? (
                          <>
                            <ul>{detailQuery.data.items.map((item, index) => <li key={`${item.productName}-${item.color}-${item.size}-${index}`}><span>{item.productName}<small>{item.color} / {item.size} · {item.quantity} шт.</small></span><strong>{formatUsdMinor(item.lineTotalMinor)}</strong></li>)}</ul>
                            <p>Контакт: {detailQuery.data.contact.name} · {detailQuery.data.contact.phone} · {detailQuery.data.contact.email}</p>
                            {detailQuery.data.comment ? <p>Комментарий: {detailQuery.data.comment}</p> : null}
                          </>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
              {orders.pages > 1 ? (
                <nav aria-label="Страницы заказов" className={styles.pagination}>
                  <button disabled={page <= 1 || showingPreviousPage} onClick={() => { setSelectedOrderId(null); setPage((current) => current - 1); }} type="button">← Назад</button>
                  <span>{page} / {orders.pages}</span>
                  <button disabled={page >= orders.pages || showingPreviousPage} onClick={() => { setSelectedOrderId(null); setPage((current) => current + 1); }} type="button">Далее →</button>
                </nav>
              ) : null}
            </>
          ) : null}
        </section>
      </div>
    </section>
  );
}
