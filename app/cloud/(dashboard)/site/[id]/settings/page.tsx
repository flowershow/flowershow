import Form from "@/components/form";
import { updateSite } from "@/lib/actions";
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

            <DeleteSiteForm siteName={data?.subdomain!} />
        </div>
    );
}
