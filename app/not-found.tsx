import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-7xl font-bold text-gray-200">404</p>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">页面未找到</h1>
        <p className="mt-2 text-gray-500">你访问的页面不存在或已被移除</p>
        <Link href="/" className="mt-6 inline-block rounded-lg bg-violet-700 px-6 py-2 text-white hover:bg-violet-800">返回首页</Link>
      </div>
    </main>
  );
}
