import type { Metadata } from "next";

import { AuthExperience } from "@/features/auth/ui/AuthExperience";

export const metadata: Metadata = { title: "Вход", robots: { index: false } };

export default function LoginPage() {
  return <AuthExperience mode="login" />;
}
