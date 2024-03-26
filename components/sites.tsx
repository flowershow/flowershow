import { getSession } from "@/server/auth";
import { redirect } from "next/navigation";
import SiteCard from "./site-card";
import { api } from "@/trpc/server";

export default async function Sites({ limit }: { limit?: number }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const sites = await api.user.getSites.query({ limit });
  const username = session.user?.username;

  return sites.length > 0 ? (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {sites.map((site) => (
        <SiteCard key={site.id} data={site} username={username} />
      ))}
    </div>
  ) : (
    <div className="flex flex-col items-center space-y-6 py-24">
      {/* <Image
                alt="missing site"
                src="https://illustrations.popsy.co/gray/web-design.svg"
                width={200}
                height={200}
            /> */}
      <h1 className="font-cal text-4xl">Welcome!</h1>
      <p className="my-2">
        You do not have any sites yet. We recommend you get started like this
        (it only takes 2m):
      </p>
      <ol className="space-y-4">
        <li>
          1. Go to this URL with our template:{" "}
          <a
            href="https://github.com/datahubio/datahub-cloud-template"
            className="text-blue-500"
          >
            {" "}
            https://github.com/datahubio/datahub-cloud-template
          </a>
        </li>
        <li>
          2. Click on "Use this template" button at the top and create a new
          repository.
        </li>
        <li>
          3. Come back here and click on "Create New Site" button at the top of
          this page.
        </li>
        <li>
          4. Select the new repository you've just created and click on "Create
          Site".
        </li>
      </ol>
    </div>
  );
}
