import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "登录" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/apexmind");
  return <AuthForm mode="login" />;
}
