import { api } from "@/trpc/server";

export interface ListProps {
  siteId: string;
  dir?: string;
  fields?: Array<"title" | "description" | "authors" | "date" | "image">;
}

export default async function List({
  siteId,
  dir = "",
  fields = ["title", "description"],
}: ListProps) {
  const files = await api.site.getCatalogFiles.query({ siteId, dir });

  if (!files.length) {
    return (
      <div className="text-primary">No files found in this directory.</div>
    );
  }

  // Sort files by date (if available) and then by title
  const sortedFiles = [...files].sort((a, b) => {
    // If both have dates, compare dates first
    if (a.metadata.date && b.metadata.date) {
      const dateComparison =
        new Date(b.metadata.date).getTime() -
        new Date(a.metadata.date).getTime();
      if (dateComparison !== 0) return dateComparison;
    }
    // If only one has a date, prioritize the one with date
    if (a.metadata.date) return -1;
    if (b.metadata.date) return 1;
    // If no dates or dates are equal, compare titles
    return (a.metadata.title || "").localeCompare(b.metadata.title || "");
  });

  return (
    <div className="not-prose lg:divide-y">
      {sortedFiles.map(({ _url, metadata }) => (
        <article
          key={_url}
          className="relative isolate flex flex-col gap-8 py-8 font-title lg:flex-row lg:py-10"
        >
          {fields.includes("image") && (
            <div className="relative aspect-video overflow-hidden lg:aspect-[2/1] lg:w-64 lg:shrink-0">
              <img
                alt="Image"
                src={metadata.image ?? "https://fakeimg.pl/600x400?text=Image"}
                className="absolute inset-0 h-full w-full rounded-2xl bg-gray-50 object-cover"
              />
              <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-gray-900/10" />
            </div>
          )}
          <div>
            {fields.includes("date") && (
              <div className="flex items-center gap-x-4 text-sm">
                {metadata.date && (
                  <time
                    dateTime={metadata.date}
                    className="text-primary-subtle"
                  >
                    {metadata.date.slice(0, 10)}
                  </time>
                )}
              </div>
            )}
            <div className="group relative max-w-3xl">
              {fields.includes("title") && (
                <h3 className="mt-3 text-lg/6 font-semibold text-primary-strong group-hover:text-primary-emphasis">
                  <a href={_url!}>
                    <span className="absolute inset-0" />
                    {metadata.title}
                  </a>
                </h3>
              )}
              {fields.includes("description") && (
                <p className="text-md/6 mt-5 line-clamp-3 text-primary-emphasis">
                  {metadata.description}
                </p>
              )}
            </div>
            {fields.includes("authors") && (
              <div className="mt-6 flex border-t border-primary-faint pt-6">
                <div className="relative flex items-center gap-x-4">
                  <div className="text-sm/6">
                    <p className="font-semibold text-primary-strong">
                      <span className="absolute inset-0" />
                      {metadata.authors?.join(", ") || ""}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
