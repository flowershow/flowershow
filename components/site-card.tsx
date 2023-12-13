/* import BlurImage from "@/components/blur-image";
* import { placeholderBlurhash } from "@/lib/utils"; */
import { Site } from "@prisma/client";
import Link from "next/link";
import { env } from "@/env.mjs"

export default function SiteCard({ data }: { data: Site }) {
    const url = `${data.subdomain}.${env.NEXT_PUBLIC_ROOT_DOMAIN}`;
    return (
        <div className="relative rounded-lg border border-stone-200 pb-10 shadow-md transition-all hover:shadow-xl dark:border-stone-700 dark:hover:border-white">
            <Link
                href={`/site/${data.id}/settings`}
                className="flex flex-col overflow-hidden rounded-lg"
            >
                <div className="p-4">
                    <h3 className="my-0 truncate font-cal text-xl font-bold tracking-wide dark:text-white">
                        {data.subdomain}
                    </h3>
                    {/* <p className="mt-2 line-clamp-1 text-sm font-normal leading-snug text-stone-500 dark:text-stone-400">
                        {data.description}
                    </p> */}
                </div>
                {/* <BlurImage
                    alt={data.subdomain ?? "Card thumbnail"}
                    width={500}
                    height={400}
                    className="h-44 object-cover"
                    src={data.image ?? "/placeholder.png"}
                    placeholder="blur"
                    blurDataURL={data.imageBlurhash ?? placeholderBlurhash}
                />
                <div className="border-t border-stone-200 p-4 dark:border-stone-700">
                    <h3 className="my-0 truncate font-cal text-xl font-bold tracking-wide dark:text-white">
                        {data.subdomain}
                    </h3>
                    <p className="mt-2 line-clamp-1 text-sm font-normal leading-snug text-stone-500 dark:text-stone-400">
                        {data.description}
                    </p>
                </div> */}

            </Link>
            <div className="absolute bottom-4 flex w-full justify-between space-x-4 px-4">
                <a
                    href={
                        env.NEXT_PUBLIC_VERCEL_ENV
                            ? `https://${url}`
                            : `http://${data.subdomain}.localhost:3000`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="truncate rounded-md bg-stone-100 px-2 py-1 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700"
                >
                    {url} ↗
                </a>
                {/* <Link
                    href={`/site/${data.id}/analytics`}
                    className="flex items-center rounded-md bg-green-100 px-2 py-1 text-sm font-medium text-green-600 transition-colors hover:bg-green-200 dark:bg-green-900 dark:bg-opacity-50 dark:text-green-400 dark:hover:bg-green-800 dark:hover:bg-opacity-50"
                >
                    <BarChart height={16} />
                    <p>{random(10, 40)}%</p>
                </Link> */}
            </div>
        </div>
    );
}
