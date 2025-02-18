export default function ObsidianQuickstart() {
  return (
    <div className="flex max-w-screen-xl flex-col px-8 py-16">
      {/* <div className="mb-8 w-full max-w-[600px]">
        <div className="relative overflow-hidden pt-[56.25%]">
          <iframe
            className="absolute inset-0 h-full w-full"
            src="https://www.youtube.com/embed/HxD6NWYCea0"
            title="Flowershow Obsidian Tutorial"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div> */}
      <div className="flex items-center justify-between">
        <h1 className="font-cal text-3xl font-bold dark:text-white">
          Publish Your Obsidian Vault (in 2 minutes)
        </h1>
      </div>
      <div className="mt-6">
        <h3 className="mt-4 text-lg font-semibold">Create your site</h3>
        <div className="mt-2 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
          <ol className="list-inside list-decimal space-y-3">
            <li>
              Go to our{" "}
              <a
                className="underline"
                target="_blank"
                rel="noreferrer noopener"
                href="https://github.com/flowershow/flowershow-cloud-template/tree/main"
              >
                GitHub template repository
              </a>{" "}
              and click &quot;Use this template&quot; button to create a new
              repository (can be private if you want). It will be used to
              synchronize between obsidian and Flowershow (plus it provides a
              handy backup!).
            </li>
            <li>
              Click{" "}
              <a
                className="underline"
                href="/new"
                target="_blank"
                rel="noreferrer noopener"
              >
                here
              </a>{" "}
              and create a new site from that repository.
            </li>
            <li>
              When the site finishes syncing, click the &quot;Visit&quot; button
              to open it.
            </li>
          </ol>
        </div>

        <h3 className="mt-4 text-lg font-semibold">Publish Obsidian vault</h3>
        <div className="mt-2 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
          <ol className="list-inside list-decimal space-y-3" start={4}>
            <li>
              If you haven&apos;t already, install and enable the Flowershow
              plugin in your Obsidian vault.
            </li>
            <li>
              In the plugin settings, enter your GitHub username, name of the
              repository you&apos;ve created earlier and a GitHub Personal
              Access Token.
            </li>
            <li>
              Click the Flowershow icon in Obsidian ribbon and use available
              options to synchronize your vault&apos;s content with your site.
            </li>
          </ol>
        </div>
        <p className="mt-8 text-xl font-semibold">
          Done! Your notes are now ready to be shared with the world! 💐
        </p>
      </div>
    </div>
  );
}
