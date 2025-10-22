import { getConfig } from "@/lib/app-config";
import { SiteLoginForm } from "./site-login-form";
import Image from "next/image";
import { resolveLinkToUrl } from "@/lib/resolve-link";
import { api } from "@/trpc/server";
import { getSiteUrlPath, getSiteUrl } from "@/lib/get-site-url";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { notFound, redirect } from "next/navigation";
import { SITE_ACCESS_COOKIE_NAME } from "@/lib/const";
import { siteKeyBytes } from "@/lib/site-hmac-key";
import { getSite } from "@/lib/get-site";
import { internalGetSiteById } from "@/lib/db/internal";

const config = getConfig();

interface RouteParams {
  user: string;
  project: string;
}

export default async function LoginPage(props: { params: Promise<RouteParams> }) {
  const params = await props.params;
  const userName = decodeURIComponent(params.user); // user's github username or "_domain" if on custom domain (see middleware)
  const projectName = decodeURIComponent(params.project);

  const site = await getSite(userName, projectName);

  if (site.privacyMode === "PUBLIC") {
    // TODO redirect to returnTo
    redirect(getSiteUrl(site));
  }

  const cookie = (await cookies()).get(SITE_ACCESS_COOKIE_NAME(site.id));

  if (cookie?.value) {
    try {
      const _site = await internalGetSiteById(site.id); // TODO should be a better way
      if (!_site) {
        notFound();
      }
      const secret = await siteKeyBytes(_site.id, _site.tokenVersion);

      await jwtVerify(cookie.value, secret, { audience: site.id });
      // TODO redirect to returnTo
      redirect(getSiteUrl(site));
    } catch (_) {
      console.log("Not authenticated");
      // display the form
    }
  }

  const siteConfig = await api.site.getConfig
    .query({
      siteId: site.id,
    })
    .catch(() => null);
  const sitePrefix = getSiteUrlPath(site);

  const logo = resolveLinkToUrl({
    target: siteConfig?.nav?.logo ?? siteConfig?.logo ?? config.logo, // default to Flowershow logo
    prefix: sitePrefix,
    isSrcLink: true,
    domain: site.customDomain,
  });

  return (
    <div className="mx-5 border border-primary-faint p-10 sm:mx-auto sm:w-full sm:max-w-md sm:rounded-lg sm:shadow-md md:max-w-lg md:p-12">
      <Image
        alt="Logo"
        width={100}
        height={100}
        className="relative mx-auto h-12 w-auto"
        src={logo}
      />
      <h1 className="mt-6 text-center font-dashboard-heading text-3xl">
        Authentication required
      </h1>

      <div className="mt-8">
        <SiteLoginForm siteId={site.id} />
      </div>
    </div>
  );
}
