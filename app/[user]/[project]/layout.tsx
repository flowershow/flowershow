/* import Image from "next/image";
 * import Link from "next/link"; */
import { ReactNode } from "react";
/* import CTA from "@/components/cta";
 * import ReportAbuse from "@/components/report-abuse"; */
import { notFound, redirect } from "next/navigation";
import { fontMapper } from "@/styles/fonts";
import { Metadata } from "next";
import { env } from "@/env.mjs";
import { api } from "@/trpc/server";

export async function generateMetadata({
  params,
}: {
  params: { user: string; project: string };
}): Promise<Metadata | null> {
  const project = decodeURIComponent(params.project);
  const data = api.site.get.query({
    gh_username: params.user,
    projectName: project,
  });

  if (!data) {
    return null;
  }
  return {};
  /* const {
*     name: title,
*     description,
*     image,
*     logo,
* } = data

* return {
*     title,
*     description,
*     openGraph: {
*         title,
*         description,
*         images: [image],
*     },
*     twitter: {
*         card: "summary_large_image",
*         title,
*         description,
*         images: [image],
*         creator: "@vercel",
*     },
*     icons: [logo],
*     metadataBase: new URL(`https://${domain}`),
*     // Optional: Set canonical URL to custom domain if it exists
*     // ...(params.domain.endsWith(`.${env.NEXT_PUBLIC_ROOT_DOMAIN}`) &&
*     //   data.customDomain && {
*     //     alternates: {
*     //       canonical: `https://${data.customDomain}`,
*     //     },
*     //   }),
* }; */
}

export default async function SiteLayout({
  params,
  children,
}: {
  params: { user: string; project: string };
  children: ReactNode;
}) {
  const data = await api.site.get.query({
    gh_username: params.user,
    projectName: params.project,
  });

  if (!data) {
    notFound();
  }

  // Optional: Redirect to custom domain if it exists
  if (
    data.customDomain &&
    env.REDIRECT_TO_CUSTOM_DOMAIN_IF_EXISTS === "true"
  ) {
    return redirect(`https://${data.customDomain}`);
  }

  return (
    <div className={fontMapper["font-work"]}>
      <div>{children}</div>

      {/* {domain == `demo.${env.NEXT_PUBLIC_ROOT_DOMAIN}` ||
                domain == `platformize.co` ? (
                <CTA />
            ) : (
                <ReportAbuse />
            )} */}
    </div>
  );
}

/*
 *         <div className={fontMapper[data.font]}>
 *             <div className="ease left-0 right-0 top-0 z-30 flex h-16 bg-white transition-all duration-150 dark:bg-black dark:text-white">
 *                 <div className="mx-auto flex h-full max-w-screen-xl items-center justify-center space-x-5 px-10 sm:px-20">
 *                     <Link href="/" className="flex items-center justify-center">
 *                         <div className="inline-block h-8 w-8 overflow-hidden rounded-full align-middle">
 *                             <Image
 *                                 alt={data.name || ""}
 *                                 height={40}
 *                                 src={data.logo || ""}
 *                                 width={40}
 *                             />
 *                         </div>
 *                         <span className="ml-3 inline-block truncate font-title font-medium">
 *                             {data.name}
 *                         </span>
 *                     </Link>
 *                 </div>
 *             </div>
 *
 *             <div className="mt-20">{children}</div>
 *
 *             {domain == `demo.${env.NEXT_PUBLIC_ROOT_DOMAIN}` ||
 *                 domain == `platformize.co` ? (
 *                 <CTA />
 *             ) : (
 *                 <ReportAbuse />
 *             )}
 *         </div> */
