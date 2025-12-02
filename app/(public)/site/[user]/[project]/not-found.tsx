export default function NotFoundPage() {
  return (
    <div className="not-found">
      <div className="not-found-inner">
        <h1 className="not-found-title">404</h1>
        <p className="not-found-subtitle">Page Not Found</p>
        <p className="not-found-description">
          The page you are looking for might not exist or has been moved.
        </p>
        <p className="not-found-hint">
          Site creator? You can find debugging instructions{" "}
          <a
            href="https://flowershow.app/blog/how-to-debug-404-pages#common-causes-of-404-errors"
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
