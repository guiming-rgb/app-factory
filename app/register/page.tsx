import Link from 'next/link';
import { RegisterForm } from './register-form';
import { isAuthEnabled } from '@/lib/auth-config';

export default function RegisterPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const nextPath =
    searchParams.next?.startsWith('/') ? searchParams.next : '/onboarding';

  if (!isAuthEnabled()) {
    return (
      <AuthShell title="注册不可用">
        <p className="text-sm text-gray-600">
          请在 <code className="rounded bg-gray-100 px-1">.env.local</code> 配置{' '}
          <code className="rounded bg-gray-100 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
          后重启服务。
        </p>
        <Link href="/" className="mt-4 inline-block text-violet-700 underline">
          返回首页
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="注册 App 生产工厂">
      <RegisterForm nextPath={nextPath} />
    </AuthShell>
  );
}

function AuthShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-blue-50 px-6 py-16">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 text-sm font-bold text-white">
            A
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-950">{title}</h1>
          <p className="mt-1 text-sm text-gray-500">创建你的账号，开始生成应用</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          {children}
        </div>
        <p className="mt-6 text-center text-xs text-gray-400">
          &copy; {new Date().getFullYear()} App 生产工厂
        </p>
      </div>
    </main>
  );
}
