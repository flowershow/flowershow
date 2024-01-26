import prisma from "@/server/db";
import Form from "@/components/form";
import { updateSite } from "@/lib/actions";

export default async function SiteSettingsDomains({
    params,
}: {
    params: { id: string };
}) {
    const data = await prisma.site.findUnique({
        where: {
            id: decodeURIComponent(params.id),
        },
    });

    return (
        <div className="flex flex-col space-y-6">
            <Form
                title="Subdomain"
                description="The subdomain for your site."
                helpText="The name must consist only of ASCII letters, digits, and the characters '-' and '_'. Please ensure a maximum of 32 characters is used."
                inputAttrs={{
                    name: "subdomain",
                    type: "text",
                    defaultValue: data?.subdomain!,
                    placeholder: "subdomain",
                    maxLength: 32,
                    pattern: "^[a-zA-Z0-9_-]+$",
                    disallowed: ["www", "cloud", "mail", "ftp", "admin", "login", "api", "webmail", "blog", "shop", "forum", "store", "cdn", "smtp", "imap", "pop", "test", "dev", "stage", "demo", "staging", "beta", "alpha", "sandbox", "mysql", "postgresql", "redis", "mongodb", "auth", "billing", "dashboard", "support", "help", "chat", "download", "upload", "assets", "static", "media", "images", "videos", "css", "js", "fonts"]
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
        </div>
    );
}
