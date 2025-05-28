export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="mb-4 text-6xl font-bold text-gray-800">404</h1>
        <p className="mb-8 text-xl text-gray-600">Page Not Found</p>
        <p className="text-gray-500">
          The page you are looking for might not exist or has been moved.
        </p>
        <p className="mt-4 text-sm text-gray-400">
          Site creator? You can find debugging instructions{" "}
          <a
            href="https://flowershow.app/blog/how-to-debug-404-pages#common-causes-of-404-errors"
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            here
          </a>
          .
        </p>
      </div>
    </div>
  );
}
