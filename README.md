<p align="center">
  <a href="https://datahub.io/">
    <img alt="datahub" src="http://datahub.io/static/img/logo-cube.png" width="146">
  </a>
</p>

The next generation DataHub. Turn Github into a DataHub. Share data + content in a useable form with team-mates or the world.

## Dev

To setup a local dev environment:

1. Clone this repo
2. Install the dependencies with `npm i`
3. Run `npm run dev`

## Deploy

We are currently deploying Datahub Next to Vercel and Cloudflare.

Each of the deployments is using a different branch:

- `main` branch is being deployed to Cloudflare
- `with-SSR` branch is being deployed to Vercel

The reason for this is that we believe that the Cloudflare team is heading their deployments support towards a good path and we would really like to use their service but, as of the day this text is being written (2023-03-10), we are still unable make our SSR code work on it (since Next.js edge runtime support and Next.js deployments to Cloudflare Pages are still very recent and experimental features).

With that in mind, we are keeping static aspects of the application in the `main` branch and SSR aspects in the `with-SSR` branch.

### Vercel deployment

To deploy the Datahub Next repo to Vercel:

1. Create a new project on Vercel and link the [Datahub Next repo](https://github.com/datopian/datahub-next) into it
2. Choose the Next.js preset
3. Save and deploy

After that the deployment should be working, but there are two (optional) extra steps:

##### Change the production branch to `with-SSR`

To make `with-SSR` the production branch on Vercel, navigate to `Settings -> Git` and change the `Production Branch` field to `with-SSR`.

##### Prevent deployments from the `main` branch

Even after changing the production branch, Vercel will still build and deploy previews of the `main` branch. 

To prevent that from happening, on the Git settings page on Vercel change the `Ignored Build Step` field to:

```sh
if [ "$VERCEL_GIT_COMMIT_REF" != "main" ]; then exit 1; else exit 0; fi
```

#### Notes

##### Symlinks 

The Datahub Next project uses symlinks to link folders from `content/*` to `public/*`. The symlinks we currently have are:

- `public/assets` -> soft link targeting `content/assets`
- `public/Exaclidraw` -> soft link targeting `content/Excalidraw`


Vercel has its own CLI build command to deploy Next.js projects. 

Unfortunately, the Vercel CLI build command does not support symlinks[^1], therefore causing errors on the deployment and also when building the project locally using `vercel build`:

```
Error: ENOENT: no such file or directory, mkdir '/vercel/output/static/assets'
BUILD_FAILED: ENOENT: no such file or directory, mkdir '/vercel/output/static/assets'
```

To keep the symlinks as they are and still make it work on Vercel, we added a `prebuild` script (`datahub-next/scripts/fix-symlinks`) that checks whether the build is running in the Vercel environment or not and, if it is, recreate the symlinks.

```javascript
if (process.env.VERCEL_ENV) {
  console.log(
    "[scripts/fix-symlinks.mjs] Vercel environment detected. Fixing symlinks..."
  );

  const pathToAssetsLn = "./public/assets";
  const pathToExcalidrawLn = "./public/Excalidraw";

  fs.unlinkSync(pathToAssetsLn);
  fs.unlinkSync(pathToExcalidrawLn);

  fs.symlinkSync("../../public/assets", pathToAssetsLn);
  fs.symlinkSync("../../public/Excalidraw", pathToExcalidrawLn);
}
```

[^1]: Based on this issue https://github.com/vercel/vercel/discussions/5347. Quite old, but this is mentioned only in a few places.


### Cloudflare deployment

The issue with deploying Datahub Next to Cloudflare with SSR support at the moment is that currently the project's SSR requirements are dependent on the Node.js Native API to work, therefore we can't use the Next.js Edge runtime for the SSR aspect of the project, which is required to deploy Next.js projects with SSR to Cloudflare Pages.

To deploy the `main` branch to Cloudflare:

1. Create a Cloudflare Pages project in Cloudflare and link the [Datahub Next repo](https://github.com/datopian/datahub-next) into it
2. Set the build command to `npm run export`
3. set the build output directory to `/out` 

The deployment of the main branch should then be working. To prevent Cloudflare from building `with-SSR` in vain, on the Cloudflare Pages project page navigate to `Settings -> Builds and deployments`, look for the Preview branches options and set Branches excluded to `with-SSR`.

#### Notes
##### Why we are currently unable to deploy the SSR aspect of the project to Cloudflare

There are two supported runtimes for Next.js: `node` and `(experimental) edge`[^2]. 

In order to enable SSR support and API folder support on our deployment on Cloudflare, we have to change the Next.js runtime from `node` (default) to `experimental-edge`[^3], so that Cloudflare can deploy workers for those[^4] (CF workers use V8 and do not support Node.js).

Next.js edge functions have an important restriction: they do not support the native Node.js API[^4], hence not supporting other packages that rely on the native API, and the same also applies to CF Workers. To use edge functions, we'd have to restrict our usage of APIs to the ones that are supported, the list of supported APIs can be found in https://nextjs.org/docs/api-reference/edge-runtime .

In our "MDX pipeline", we are using many dependencies that depend on Node.js native API to work.

As mentioned in the next.js docs[^5]:

> Next.js' default runtime configuration is good for most use cases, but there are still many reasons to change to one runtime over the other one.
For example, for API routes that rely on native Node.js APIs, they need to run with the Node.js Runtime. However, if an API only uses something like cookie-based authentication, using Middleware and the Edge Runtime will be a better choice due to its lower latency as well as better scalability.


[^2]: https://nextjs.org/docs/advanced-features/react-18/switchable-runtime#runtime-differences

[^3]: https://vercel.com/docs/concepts/functions/edge-functions

[^4]: > The @cloudflare/next-on-pages CLI transforms the Edge Runtime components of your project into a _worker.js file which is deployed with Pages Functions - https://developers.cloudflare.com/pages/framework-guides/deploy-a-nextjs-site/

[^5]: > Native Node.js APIs are not supported. For example, you can't read or write to the filesystem
node_modules can be used, as long as they implement ES Modules and do not use native Node.js APIs - https://nextjs.org/docs/api-reference/edge-runtime#unsupported-apis
