export function VisualDemo() {
  return (
    <div>
      <h1 className="mt-16 text-center text-lg font-bold tracking-tight dark:text-white sm:text-4xl">
        Your GitHub. Our Platform. Perfect Harmony.
      </h1>
      <p className="mx-auto mt-6 max-w-xl text-center text-lg leading-8 text-gray-600 dark:text-gray-400">
        DataHub Cloud syncs directly with your GitHub, allowing you to manage
        and publish datasets where you&apos;re already comfortable working.
        Focus on your data and leave everything else to us.
      </p>
      <div className="mt-8 flex flex-row flex-wrap items-center justify-center gap-8 md:flex-nowrap">
        <div className="flex flex-col items-center rounded-lg">
          <video
            className="h-full w-full rounded-3xl"
            autoPlay
            loop
            muted
            src="/DataHub-Cloud-Demo.mp4"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      </div>
    </div>
  );
}
