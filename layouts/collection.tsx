/* eslint import/no-default-export: off */
import { formatDate } from "@/lib/formatDate.js";

export default function DocsLayout({ children, frontMatter }) {
  const { title, created, date: docDate, description } = frontMatter;
  
  const date = created || docDate;

  return (
    <article className="docs prose text-primary dark:text-primary-dark dark:prose-invert prose-headings:font-headings prose-a:break-words mx-auto p-6">
      <header>
        <div className="mb-6">
          {date && (
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
              <time dateTime={date}>{formatDate(date)}</time>
            </p>
          )}
          {title && <h1 className="mb-2">{title}</h1>}
          {description && <p className="text-xl mt-0">{description}</p>}
        </div>
      </header>
      <section>{children}</section>
    </article>
  );
}
