"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-7xl font-bold text-gray-200">500</p>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">服务器错误</h1>
        <p className="mt-2 text-gray-500">请稍后重试</p>
        <button onClick={reset} className="mt-6 rounded-lg bg-violet-700 px-6 py-2 text-white hover:bg-violet-800">重试</button>
      </div>
    </main>
  );
}
