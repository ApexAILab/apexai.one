"use client";

import Link from "next/link";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { BrandMark } from "@/components/brand/BrandMark";

type AuthFormProps = {
  mode: "login" | "register";
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isRegister = mode === "register";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message || "操作失败，请重试");
      router.replace("/apexmind");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "操作失败，请重试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <Link href="/" className="auth-brand" aria-label="返回 APEXAI">
        <BrandMark />
        <strong>APEXAI</strong>
      </Link>
      <section className="auth-card">
        <div className="auth-heading">
          <h1>{isRegister ? "注册" : "登录"}</h1>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            <span>用户名</span>
            <input
              name="username"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              minLength={3}
              maxLength={24}
              required
              autoFocus
            />
          </label>
          <label>
            <span>密码</span>
            <div className="password-field">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={isRegister ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                maxLength={128}
                required
              />
              <button
                type="button"
                aria-label={showPassword ? "隐藏密码" : "显示密码"}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              </button>
            </div>
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="auth-submit" type="submit" disabled={submitting}>
            <span>{submitting ? "请稍候…" : isRegister ? "创建账户" : "登录"}</span>
            <ArrowRight aria-hidden="true" />
          </button>
        </form>

        <p className="auth-switch">
          {isRegister ? "已有账户？" : "还没有账户？"}{" "}
          <Link href={isRegister ? "/login" : "/register"}>
            {isRegister ? "直接登录" : "立即注册"}
          </Link>
        </p>
      </section>
    </main>
  );
}
