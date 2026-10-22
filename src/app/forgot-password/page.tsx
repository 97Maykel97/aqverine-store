import type { Metadata } from "next";

import { AuthExperience } from "@/features/auth/ui/AuthExperience";

export const metadata: Metadata = { title: "Восстановление доступа", robots: { index: false } };

export default function ForgotPasswordPage() {
  return <AuthExperience mode="reset" />;
}
