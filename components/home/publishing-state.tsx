export function PublishingState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="text-center">
        <div className="relative inline-block">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
        </div>
        <p className="text-xl font-semibold text-gray-700 mb-2">
          Publishing your site...
        </p>
        <p className="text-sm text-gray-500">
          This usually takes 10-20 seconds
        </p>
      </div>
    </div>
  );
}
