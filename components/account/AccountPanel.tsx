"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { requestJson } from "@/lib/api-client";

export function AccountPanel({ username }: { username: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    try {
      await requestJson("/api/auth/logout", { method: "POST" });
      router.replace("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="account-card">
      <div><span>用户名</span><strong>{username}</strong></div>
      <button type="button" onClick={logout} disabled={loading}>
        <LogOut aria-hidden="true" /> {loading ? "正在退出…" : "退出登录"}
      </button>
    </section>
  );
}
