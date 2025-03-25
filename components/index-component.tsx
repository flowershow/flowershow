import { api } from "@/trpc/server";

export interface IndexProps {
  siteId: string;
  dir?: string;
}

export default async function Index({ siteId, dir = "" }: IndexProps) {
  const files = await api.site.getCatalogFiles.query({ siteId, dir });

  if (!files.length) {
    return (
      <div className="text-primary">No files found in this directory.</div>
    );
  }

  return (
    <div className="not-prose">
      {files.map((file) => (
        <article
          key={file._path}
          className="relative isolate flex flex-col gap-8 border-b border-[#e5e7eb] py-8 last:border-b-0 lg:flex-row lg:py-12"
        >
          <a href={file._url}>
            {/* <div className="relative aspect-video sm:aspect-[2/1] lg:aspect-square lg:w-64 lg:shrink-0">
            <img
              alt=""
              src={file.image}
              className="absolute inset-0 h-full w-full rounded-2xl bg-gray-50 object-cover"
            />
            <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-gray-900/10" />
          </div> */}
            <div>
              <div className="flex items-center gap-x-4 font-title text-xs">
                {file.date && (
                  <time dateTime={file.date} className="text-primary-subtle">
                    {file.date.slice(0, 10)}
                  </time>
                )}
                {/* <a
                href={file.category.href}
                className="relative z-10 rounded-full bg-gray-50 px-3 py-1.5 font-medium text-gray-600 hover:bg-gray-100"
              >
                {file.category.title}
              </a> */}
              </div>
              <div className="group relative max-w-xl">
                <h3 className="mt-3 font-title text-lg/6 font-semibold text-primary-strong group-hover:text-primary">
                  <span className="absolute inset-0" />
                  {file.title}
                </h3>
                <p className="mt-5 text-primary">{file.description}</p>
              </div>
              {/* <div className="mt-6 flex border-t border-gray-900/5 pt-6">
              <div className="relative flex items-center gap-x-4">
                <img
                  alt=""
                  src={file.author.imageUrl}
                  className="h-10 w-10 rounded-full bg-gray-50"
                />
                <div className="text-sm/6">
                  <p className="font-semibold text-gray-900">
                    <a href={file.author.href}>
                      <span className="absolute inset-0" />
                      {file.author.name}
                    </a>
                  </p>
                  <p className="text-gray-600">{file.author.role}</p>
                </div>
              </div>
            </div> */}
            </div>
          </a>
        </article>
      ))}
    </div>
  );
}
