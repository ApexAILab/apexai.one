import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandMark } from "@/components/brand/BrandMark";
import { AccountPanel } from "@/components/account/AccountPanel";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "账户" };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <main className="account-page">
      <Link href="/" className="auth-brand"><BrandMark /><strong>APEXAI</strong></Link>
      <div className="account-content"><span>Account</span><h1>账户</h1><AccountPanel username={user.username} /></div>
    </main>
  );
}
