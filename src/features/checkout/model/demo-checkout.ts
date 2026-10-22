import { z } from "zod";

export const checkoutSchema = z.object({
  name: z.string().trim().min(2, "Укажите имя — минимум 2 символа").max(80),
  email: z.email("Введите корректный email"),
  phone: z.string().regex(/^\+?[\d\s()-]{10,20}$/, "Введите номер телефона с кодом страны"),
  comment: z.string().max(500, "Не больше 500 символов"),
  consent: z.boolean().refine((value) => value, "Подтвердите согласие"),
});

export type CheckoutFields = z.infer<typeof checkoutSchema>;
