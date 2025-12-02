"use client";

export default function Error({ error }: { error: Error }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="max-w-4xl text-center">
        <h1 className="mb-4 text-6xl font-bold text-gray-800">500</h1>
        <p className="mb-8 text-xl text-gray-600">Internal Server Error</p>
        <p className="text-gray-500">
          An error occurred while rendering this page. Please try again later.
        </p>
      </div>
    </div>
  );
}
