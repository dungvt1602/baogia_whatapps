"use client";

import { useState } from "react";

// FRONTEND: component chạy trên trình duyệt, gọi tới API backend ở /api/hello
export default function Home() {
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function callApi() {
    setLoading(true);
    const res = await fetch("/api/hello");
    const data = await res.json();
    setResult(JSON.stringify(data, null, 2));
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-bold">Next.js Fullstack Demo</h1>
      <p className="text-gray-500">Frontend (trang này) + Backend (/api/hello)</p>

      <button
        onClick={callApi}
        disabled={loading}
        className="rounded-lg bg-black px-5 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {loading ? "Đang gọi..." : "Gọi API backend"}
      </button>

      {result && (
        <pre className="max-w-lg overflow-auto rounded-lg bg-gray-100 p-4 text-sm dark:bg-gray-800">
          {result}
        </pre>
      )}
    </main>
  );
}
