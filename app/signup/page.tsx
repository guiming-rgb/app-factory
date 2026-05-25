import Link from "next/link";

import { SignupForm } from "@/components/SignupForm";
import { isAuthEnabled } from "@/lib/auth-config";

export default function SignupPage({
  searchParams
}: {
  searchParams: { next?: string };
}) {
  const nextPath =
    searchParams.next?.startsWith("/") ? searchParams.next : "/projects";

  if (!isAuthEnabled()) {
    return (
      <AuthShell title="注册不可用">
        <p className="text-sm text-gray-600">
          请先配置 <code className="rounded bg-gray-100 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>。
        </p>
        <Link href="/" className="mt-4 inline-block text-violet-700 underline">
          返回首页
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="注册 App 生产工厂">
      <SignupForm nextPath={nextPath} />
    </AuthShell>
  );
}

function AuthShell({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-gray-50 px-6 py-16">
      <div className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <Link href="/" className="text-sm text-gray-500 hover:text-black">
          ← 首页
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-gray-950">{title}</h1>
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
