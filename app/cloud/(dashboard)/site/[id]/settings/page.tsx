import Form from "@/components/form";
import DeleteSiteForm from "@/components/form/delete-site-form";
import { api } from "@/trpc/server";

export default async function SiteSettingsIndex({
  params,
}: {
  params: { id: string };
}) {
  const data = await api.site.getById.query({
    id: decodeURIComponent(params.id),
  });

  const updateSite = async ({
    id,
    key,
    value,
  }: {
    id: string;
    key: string;
    value: string;
  }) => {
    "use server";
    await api.site.update.mutate({ id, key, value });
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* <Form
                title="Name"
                description="The name of your site. This will be used as the meta title on Google as well."
                helpText="Please use 32 characters maximum."
                inputAttrs={{
                    name: "name",
                    type: "text",
                    defaultValue: data?.name!,
                    placeholder: "My Awesome Site",
                    maxLength: 32,
                }}
                handleSubmit={updateSite}
            /> */}

      {/* <Form
                title="Description"
                description="The description of your site. This will be used as the meta description on Google as well."
                helpText="Include SEO-optimized keywords that you want to rank for."
                inputAttrs={{
                    name: "description",
                    type: "text",
                    defaultValue: data?.description!,
                    placeholder: "A blog about really interesting things.",
                }}
                handleSubmit={updateSite}
            /> */}

      {/* <Form
                title="Repository"
                description="Repository used to fetch content for your site."
                inputAttrs={{
                    name: "gh_repository",
                    type: "select",
                    defaultValue: data?.gh_repository!,
                }}
                handleSubmit={updateSite}
            /> */}

      <Form
        title="Name"
        description="The name of your site."
        helpText="The name must consist only of ASCII letters, digits, and the characters '-' and '_'. Please ensure a maximum of 32 characters is used."
        inputAttrs={{
          name: "projectName",
          type: "text",
          defaultValue: data?.projectName!,
          placeholder: "site name",
          maxLength: 32,
          pattern: "^[a-zA-Z0-9_-]+$",
          disallowed: [
            "www",
            "cloud",
            "mail",
            "ftp",
            "admin",
            "login",
            "api",
            "webmail",
            "blog",
            "shop",
            "forum",
            "store",
            "cdn",
            "smtp",
            "imap",
            "pop",
            "test",
            "dev",
            "stage",
            "demo",
            "staging",
            "beta",
            "alpha",
            "sandbox",
            "mysql",
            "postgresql",
            "redis",
            "mongodb",
            "auth",
            "billing",
            "dashboard",
            "support",
            "help",
            "chat",
            "download",
            "upload",
            "assets",
            "static",
            "media",
            "images",
            "videos",
            "css",
            "js",
            "fonts",
          ],
        }}
        handleSubmit={updateSite}
      />

      <Form
        title="Branch"
        description="Repository branch used to fetch content for your site."
        helpText="This is the branch that will be used to fetch content for your site."
        inputAttrs={{
          name: "gh_branch",
          type: "text",
          defaultValue: data?.gh_branch!,
        }}
        handleSubmit={updateSite}
      />

      <DeleteSiteForm siteName={data?.projectName!} />
    </div>
  );
}
