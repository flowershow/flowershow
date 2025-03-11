import Form from "@/components/form";
import DeleteSiteForm from "@/components/form/delete-site-form";
import { Feature, isFeatureEnabled } from "@/lib/feature-flags";
import { api } from "@/trpc/server";
import { notFound } from "next/navigation";

export default async function SiteSettingsIndex({
  params,
}: {
  params: { id: string };
}) {
  const site = await api.site.getById.query({
    id: decodeURIComponent(params.id),
  });

  if (!site) {
    notFound();
  }

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
        helpText="The project name can only consist of ASCII letters, digits, and the characters ., -, and _. Please ensure a maximum of 32 characters is used."
        inputAttrs={{
          name: "projectName",
          type: "text",
          defaultValue: site?.projectName!,
          placeholder: "site name",
          maxLength: 32,
          pattern: "^[a-zA-Z0-9_.-]+$",
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
          defaultValue: site?.gh_branch!,
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
          defaultValue: site?.rootDir!,
          required: false,
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
          defaultValue: Boolean(site?.autoSync!).toString(),
        }}
        handleSubmit={updateSite}
      />

      <Form
        title="Comments"
        description="Enable Giscus comments on your site pages."
        helpText="This will add a comments section powered by GitHub Discussions to your pages. You'll need to install the Giscus app - https://github.com/apps/giscus - in your repository and enable GitHub Discussions in your repository settings."
        inputAttrs={{
          name: "enableComments",
          type: "text",
          defaultValue: Boolean(site?.enableComments!).toString(),
        }}
        handleSubmit={updateSite}
      />

      {site?.enableComments && (
        <>
          <Form
            title="Giscus Repository ID"
            description="The ID of your GitHub repository for Giscus."
            helpText="You can find this in your Giscus configuration at https://giscus.app. After selecting your repository, the Repository ID will be shown in the configuration section. It starts with 'R_'."
            inputAttrs={{
              name: "giscusRepoId",
              type: "text",
              defaultValue: site?.giscusRepoId || "",
              required: true,
              placeholder: "R_kgDOxxxxxx",
            }}
            handleSubmit={updateSite}
          />

          <Form
            title="Giscus Category ID"
            description="The ID of the discussion category in your repository."
            helpText="You can find this in your Giscus configuration at https://giscus.app. After selecting your discussion category, the Category ID will be shown in the configuration section. It starts with 'DIC_'."
            inputAttrs={{
              name: "giscusCategoryId",
              type: "text",
              defaultValue: site?.giscusCategoryId || "",
              required: true,
              placeholder: "DIC_kwDOxxxxxx",
            }}
            handleSubmit={updateSite}
          />
        </>
      )}

      <Form
        title="Custom Domain"
        description="The custom domain for your site."
        helpText={
          isFeatureEnabled(Feature.CustomDomain, site)
            ? "Enter a valid domain."
            : "Available on Premium plan only."
        }
        disabled={!isFeatureEnabled(Feature.CustomDomain, site)}
        inputAttrs={{
          name: "customDomain",
          type: "text",
          defaultValue: isFeatureEnabled(Feature.CustomDomain, site)
            ? site?.customDomain!
            : "",
          placeholder: "yourdomain.com",
          maxLength: 64,
          pattern: "^[a-z0-9]+([\\-\\.]{1}[a-z0-9]+)*\\.[a-z]{2,5}$",
        }}
        handleSubmit={updateSite}
      />

      <DeleteSiteForm siteName={site?.projectName!} />
    </div>
  );
}
