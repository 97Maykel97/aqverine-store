import type { Metadata } from "next";

import { AuthExperience } from "@/features/auth/ui/AuthExperience";

export const metadata: Metadata = { title: "Регистрация", robots: { index: false } };

export default function RegisterPage() {
  return <AuthExperience mode="register" />;
}
