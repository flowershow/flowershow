import Image from "next/image";

export default function ObsidianQuickstart() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col px-8 py-16">
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
          Install and enable the{" "}
          <a className="underline" href="obsidian://show-plugin?id=flowershow">
            Flowershow Obsidian plugin
          </a>
          .
        </div>

        <h3 className="mt-4 text-lg font-semibold">
          Step 2: Create a GitHub Repository for Syncing
        </h3>
        <div className="mt-2 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
          Click{" "}
          <a
            className="underline"
            target="_blank"
            rel="noreferrer noopener"
            href="https://github.com/flowershow/flowershow-cloud-template/tree/main"
          >
            here
          </a>{" "}
          to create a new repository from our template.
          <i className="mt-1 block">
            It will act as a backup and sync point between your Obsidian vault
            and Flowershow. (It can be private if you want.)
          </i>
          <Image
            width="600"
            height="400"
            alt="Flowershow template"
            src="/use-flowershow-template.png"
            className="my-2"
          />
        </div>

        <h3 className="mt-4 text-lg font-semibold">
          Step 3: Connect Flowershow to Your GitHub Repository
        </h3>
        <div className="mt-2 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
          Click{" "}
          <a
            className="underline"
            href="/new"
            target="_blank"
            rel="noreferrer noopener"
          >
            here
          </a>
          , select the repository you&apos;ve just created and click on
          &quot;Create Site&quot;.
          <i className="mt-1 block">
            ⚠️ Then, navigate back to this page to complete the last step.
          </i>
          <Image
            width="600"
            height="400"
            alt="Flowershow template"
            src="/create-flowershow-site.png"
            className="my-2"
          />
        </div>

        <h3 className="mt-4 text-lg font-semibold">
          Step 4: Configure Flowershow Plugin & Publish Your Vault
        </h3>
        <div className="mt-2 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
          Go to Flowershow plugin options in your Obsidian vault and input your
          GitHub username, name of your repository, and your GitHub Personal
          Access Token (
          <a
            className="underline"
            href="https://github.com/settings/tokens/new?scopes=repo"
          >
            generate one here
          </a>
          ).
          <Image
            width="600"
            height="400"
            alt="Flowershow template"
            src="/configure-plugin.png"
            className="my-2"
          />
          Lastly, click on the Flowershow icon in the Obsidian sidebar, select
          the notes to publish — and that&apos;s it!
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
