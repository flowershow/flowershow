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
          Publish Your Obsidian Vault
        </h1>
      </div>
      <div className="mt-6">
        <ol className="list-inside list-decimal space-y-3">
          <li>
            Visit our{" "}
            <a
              className="underline"
              target="_blank"
              rel="noreferrer noopener"
              href="https://github.com/flowershow/flowershow-cloud-template/tree/main"
            >
              GitHub template repository
            </a>
            . Click the green &quot;Use this template&quot; button and select
            &quot;Create a new repository&quot; from the dropdown menu.
          </li>
          <li>
            Name your repository and set its visibility (private or public).
            Click &quot;Create repository&quot; to continue.
          </li>
          <li>
            Navigate to your{" "}
            <a
              className="underline"
              href="/sites"
              target="_blank"
              rel="noreferrer noopener"
            >
              Flowershow dashboard
            </a>{" "}
            and click the &quot;Create New Site&quot; button. Select your newly
            created GitHub repository from the list to use as the foundation for
            your site.
          </li>
          <li>
            Wait for the repository synchronization to complete. Once finished,
            click the &quot;Visit&quot; button to preview your new site with the
            template content.
          </li>
          <li>
            To publish your Obsidian vault content, open Obsidian and install
            the Flowershow plugin from the Community Plugins section. Make sure
            to enable it after installation.
          </li>
          <li>
            In the Flowershow plugin settings, enter the following information:
            <ul className="ml-6 mt-2 list-disc space-y-2">
              <li>Your GitHub username</li>
              <li>The name of your GitHub repository (created in step 1)</li>
              <li>Your GitHub personal access token</li>
            </ul>
          </li>
          <li>
            After saving the settings, locate the Flowershow icon in the
            Obsidian ribbon menu (left sidebar). Click it and use the publish
            manager window to synchronize your vault content with your site.
          </li>
        </ol>
        <p className="mt-4 text-xl font-semibold">
          Done! Your notes are now ready to be shared with the world! 💐
        </p>
      </div>
    </div>
  );
}
