"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function SignupForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
        window.location.origin;

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent(nextPath)}`
        }
      });

      if (signUpError) {
        throw signUpError;
      }

      if (data.session) {
        router.push(nextPath);
        router.refresh();
        return;
      }

      setMessage("注册成功。若项目开启了邮箱确认，请查收邮件后再登录。");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "注册失败";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          邮箱
        </label>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          密码（至少 6 位）
        </label>
        <input
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-emerald-700">{message}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-black py-3 text-white disabled:opacity-50"
      >
        {loading ? "注册中…" : "注册"}
      </button>

      <p className="text-center text-sm text-gray-500">
        已有账号？{" "}
        <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="text-violet-700 underline">
          登录
        </Link>
      </p>
    </form>
  );
}
