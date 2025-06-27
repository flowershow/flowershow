import Image from "next/image";

export default function ObsidianQuickstart() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col px-8 py-16">
      {/* <div className="mb-8 w-full max-w-[600px]">
        <div className="relative overflow-hidden pt-[56.25%]">
          <iframe
            className="absolute inset-0 h-full w-full"
            src="https://www.youtube.com/embed/_2cwU6zwNWQ"
            title="Flowershow Obsidian Tutorial"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div> */}

      <div className="flex items-center justify-between">
        <h1 className="font-calle-dashboard text-3xl font-bold dark:text-white">
          Publish a Demo Site
        </h1>
      </div>

      <div className="mt-6">
        <h3 className="mt-4 text-lg font-semibold">
          Step 1: Create a GitHub Repository
        </h3>
        <div className="mt-2 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
          Click{" "}
          <a
            className="underline"
            target="_blank"
            rel="noreferrer noopener"
            href="https://github.com/new?template_owner=flowershow&template_name=flowershow-cloud-template"
          >
            here
          </a>{" "}
          to create a new repository from our template.
        </div>

        <h3 className="mt-4 text-lg font-semibold">
          Step 2: Publish it with Flowershow
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
          <Image
            width="600"
            height="400"
            alt="Flowershow template"
            src="/create-flowershow-site.png"
            className="my-2"
          />
        </div>

        <h3 className="mt-4 text-lg font-semibold">Step 3: View your site</h3>
        <div className="mt-2 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
          Wait a few moments until the site shows as &quot;Synced&quot; and
          click on the &quot;Visit site&quot; button to see how it looks.
          <Image
            width="600"
            height="400"
            alt="Flowershow template"
            src="/preview-site.png"
            className="my-2"
          />
        </div>

        <div className="mt-8 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-900/20">
          <p className="text-green-700 dark:text-green-300">
            Congratulations! You&apos;ve just published your first Flowershow
            site! 💐
          </p>
        </div>
      </div>
    </div>
  );
}
