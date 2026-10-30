import { z } from "zod";

export const profileFormSchema = z.object({
  fullName: z.string().trim().max(80, "Не больше 80 символов").refine(
    (value) => value.length === 0 || value.length >= 2,
    "Укажите минимум 2 символа",
  ),
  phone: z.string().trim().refine(
    (value) => value.length === 0 || /^\+?[\d\s()-]{10,20}$/.test(value),
    "Введите номер с кодом страны",
  ),
});

export type ProfileFormFields = z.infer<typeof profileFormSchema>;
