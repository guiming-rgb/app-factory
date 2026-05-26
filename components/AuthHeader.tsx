"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AuthHeader() {
  const [email, setEmail] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!anon) {
      setEnabled(false);
      return;
    }
    setEnabled(true);

    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!enabled) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
      {email ? (
        <>
          <Link
            href="/skills"
            className="rounded-full border border-gray-300 px-3 py-1 text-gray-800 hover:bg-gray-50"
          >
            技能管理
          </Link>
          <span className="text-gray-500">{email}</span>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-full border border-gray-300 px-3 py-1 text-gray-700 hover:bg-gray-50"
            >
              退出
            </button>
          </form>
        </>
      ) : (
        <>
          <Link
            href="/login"
            className="rounded-full border border-gray-300 px-3 py-1 text-gray-800 hover:bg-gray-50"
          >
            登录
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-black px-3 py-1 text-white hover:opacity-90"
          >
            注册
          </Link>
        </>
      )}
    </div>
  );
}
