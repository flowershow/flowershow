"use client";

export default function Error({ error }: { error: Error }) {
  return (
    <div className="error-page">
      <div className="error-page-inner">
        <h1 className="error-page-title">500</h1>
        <p className="error-page-subtitle">Internal Server Error</p>
        <p className="error-page-description">
          An error occurred while rendering this page. Please try again later.
        </p>
      </div>
    </div>
  );
}
