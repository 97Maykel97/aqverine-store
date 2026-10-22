import { z } from "zod";

const email = z.email("Введите корректный email");
const password = z.string().min(8, "Пароль должен содержать не меньше 8 символов");

export const loginSchema = z.object({ email, password });

export const registrationSchema = z.object({
  name: z.string().trim().min(2, "Укажите имя — минимум 2 символа").max(60),
  email,
  password,
  confirmation: z.string(),
}).refine((value) => value.password === value.confirmation, {
  message: "Пароли не совпадают",
  path: ["confirmation"],
});

export const passwordResetSchema = z.object({ email });

export type LoginFields = z.infer<typeof loginSchema>;
export type RegistrationFields = z.infer<typeof registrationSchema>;
export type PasswordResetFields = z.infer<typeof passwordResetSchema>;
