export default function ObsidianQuickstart() {
  return (
    <div className="flex max-w-screen-xl flex-col px-8 py-16">
      <div className="mb-8 w-full max-w-[600px]">
        <div className="relative overflow-hidden pt-[56.25%]">
          <iframe
            className="absolute inset-0 h-full w-full"
            src="https://www.youtube.com/embed/_2cwU6zwNWQ"
            title="Flowershow Obsidian Tutorial"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="font-cal text-3xl font-bold dark:text-white">
          Publish Your Obsidian Vault (in 2 minutes)
        </h1>
      </div>

      <div className="mt-6">
        <h3 className="mt-4 text-lg font-semibold">
          Step 1: Install the Flowershow Plugin
        </h3>
        <div className="mt-2 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
          <ol className="list-inside list-decimal space-y-3">
            <li>Open Obsidian.</li>
            <li>Go to Settings {`>`} Community Plugins.</li>
            <li>Search for &quot;FlowerShow&quot; and click Install.</li>
            <li>Enable the plugin once installed.</li>
          </ol>
        </div>

        <h3 className="mt-4 text-lg font-semibold">
          Step 2: Create a GitHub Repository for Syncing
        </h3>
        <div className="mt-2 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
          <ol className="list-inside list-decimal space-y-3">
            <li>
              Create a Github repository. This will act as a backup and sync
              point between Obsidian and Flowershow.
            </li>
            <li>
              Use our{" "}
              <a
                className="underline"
                target="_blank"
                rel="noreferrer noopener"
                href="https://github.com/flowershow/flowershow-cloud-template/tree/main"
              >
                template repository
              </a>{" "}
              – click &quot;Use this template&quot; button to create a new
              repository (can be private if you want).
            </li>
          </ol>
        </div>

        <h3 className="mt-4 text-lg font-semibold">
          Step 3: Connect Flowershow to Your GitHub Repository
        </h3>
        <div className="mt-2 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
          <ol className="list-inside list-decimal space-y-3">
            <li>Go back to Flowershow Cloud dashboard</li>
            <li>
              Click{" "}
              <a
                className="underline"
                href="/new"
                target="_blank"
                rel="noreferrer noopener"
              >
                here and create a new site from that repository.
              </a>
              )
            </li>
            <li>Select the GitHub repository you just created.</li>
            <li>
              Click Create Website — your Flowershow will set up your site in
              seconds!
            </li>
          </ol>
        </div>

        <h3 className="mt-4 text-lg font-semibold">
          Step 4: Sync Your Obsidian Vault & Publish
        </h3>
        <div className="mt-2 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
          <ol className="list-inside list-decimal space-y-3">
            <li>
              Go back to Obsidian and go to the Flowershow plugin settings.
            </li>
            <li>Enter the details for your GitHub repository.</li>
            <li>
              Go to the Flowershow button in the sidebar and select the notes to
              publish — and that&apos;s it!
            </li>
          </ol>
        </div>

        <div className="mt-8 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-900/20">
          <p className="text-green-700 dark:text-green-300">
            Congratulations! Your Obsidian Vault is now published with
            Flowershow. 💐
          </p>
        </div>
      </div>
    </div>
  );
}
