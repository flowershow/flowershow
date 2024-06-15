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

      <Form
        title="Root Directory"
        description="The directory within your project, in which your content is located."
        helpText="Leave this field empty if your content is not located in a subdirectory."
        inputAttrs={{
          name: "rootDir",
          type: "text",
          defaultValue: data?.rootDir!,
          required: false,
        }}
        handleSubmit={updateSite}
      />

      <Form
        title="Custom Domain"
        description="The custom domain for your site."
        helpText="Please enter a valid domain."
        inputAttrs={{
          name: "customDomain",
          type: "text",
          defaultValue: data?.customDomain!,
          placeholder: "yourdomain.com",
          maxLength: 64,
          pattern: "^[a-z0-9]+([\\-\\.]{1}[a-z0-9]+)*\\.[a-z]{2,5}$",
        }}
        handleSubmit={updateSite}
      />

      <Form
        title="Auto-sync"
        description="Automatically sync your site after each change to the GitHub repository."
        helpText="The app will install a GitHub webhook in your repository to listen to new commits made to it."
        inputAttrs={{
          name: "autoSync",
          type: "text",
          defaultValue: Boolean(data?.autoSync!).toString(),
        }}
        handleSubmit={updateSite}
      />

      <DeleteSiteForm siteName={data?.projectName!} />
    </div>
  );
}
