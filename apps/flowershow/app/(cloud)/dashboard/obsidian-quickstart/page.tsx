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
        <h1 className="font-dashboard-heading text-3xl font-bold ">
          Publish Your Obsidian Vault (in 2 minutes)
        </h1>
      </div>

      <div className="mt-6">
        <h3 className="mt-4 text-lg font-semibold">
          Step 1: Install the Flowershow Plugin
        </h3>
        <div className="mt-2 rounded-lg border border-gray-200 p-4 ">
          Install and enable the{' '}
          <a className="underline" href="obsidian://show-plugin?id=flowershow">
            Flowershow Obsidian plugin
          </a>
          .
        </div>

        <h3 className="mt-4 text-lg font-semibold">
          Step 2: Generate a Personal Access Token
        </h3>
        <div className="mt-2 rounded-lg border border-gray-200 p-4 ">
          Go to your{' '}
          <a
            className="underline"
            href="/tokens"
            target="_blank"
            rel="noreferrer noopener"
          >
            Flowershow tokens page
          </a>{' '}
          and create a new Personal Access Token.
          <i className="mt-1 block">
            Copy the token (it starts with <code>fs_pat_</code>).
          </i>
        </div>

        <h3 className="mt-4 text-lg font-semibold">
          Step 3: Configure Flowershow Plugin
        </h3>
        <div className="mt-2 rounded-lg border border-gray-200 p-4 ">
          Go to Flowershow plugin options in your Obsidian vault and input your
          Flowershow Personal Access Token and choose a site name.
        </div>

        <h3 className="mt-4 text-lg font-semibold">
          Step 4: Publish Your Vault (Or Selected Notes)
        </h3>
        <div className="mt-2 rounded-lg border border-gray-200 p-4 ">
          Lastly, click on the Flowershow icon in the Obsidian sidebar, select
          the notes to publish — and that&apos;s it!
          <br />
          <i>You can also use Flowreshow commands in the command palette.</i>
        </div>

        <div className="/20 mt-8 rounded-lg border border-green-200 bg-green-50  p-4">
          <p className="text-green-700 ">
            Congratulations! Your Obsidian Vault is now published with
            Flowershow. 💐
          </p>
        </div>
      </div>
    </div>
  );
}
